import React from "react";
import {
  refreshCallback,
  balanceCheck,
  rescanBalance,
  walletData,
  roundAmount
} from "../utils/balance";
import {
  openSendPopup,
  closeSendPopup,
  inputValidate,
  checkInputValueLenght,
  checkInputValuePrefix,
  addClass,
  openModal,
  closeModal,
  closeAllModals
} from "../utils/utils";
import { miningStart, miningStop } from "../utils/mining";
import {
  create_new_wallet,
  create_new_wallet_from_keys,
  open_from_wallet_file
} from "../utils/wallet";
import Header from "./partials/Header";
import Modal from "./partials/Modal";
import ReactTooltip from "react-tooltip";
import axios from "axios";

const { shell } = window.require("electron");
const safex = window.require("safex-nodejs-libwallet");
const remote = window.require("electron").remote;
const { dialog } = window.require("electron").remote;

export default class MiningApp extends React.Component {
  constructor(props) {
    super(props);
    this.pools_list = [
      'mcafee.safex.io:1111',
      'pool.safexnews.net:1111',
      'safex.cryptominingpools.net:3333',
      'cryptokafa.com:1111',
      'safex.cool-pool.net:3333',
      'minesfx.com:1111',
      'safex.luckypool.io:3366'
    ];
    this.state = {
      //mining settings
      active: false,
      starting: false,
      stopping: false,
      new_wallet: "",
      new_wallet_generated: false,
      exported: false,
      hashrate: "0",
      address: "",
      pool_url: "",
      mining_info: "",
      jsonConfig: {
        algo: "cryptonight/2",
        api: {
          port: 0,
          "access-token": null,
          "worker-id": null,
          ipv6: false,
          restricted: true
        },
        av: 0,
        background: false,
        colors: true,
        "cpu-affinity": null,
        "cpu-priority": null,
        "donate-level": 5,
        "huge-pages": true,
        "hw-aes": null,
        "log-file": null,
        "max-cpu-usage": 100,
        pools: [
          {
            url: "",
            user: "",
            pass: "x",
            "rig-id": null,
            nicehash: false,
            keepalive: false,
            variant: 1
          }
        ],
        "print-time": 60,
        retries: 5,
        "retry-pause": 5,
        safe: false,
        threads: null,
        "user-agent": null,
        watch: false
      },

      //UI settings
      modal: false,
      new_wallet_modal: false,
      create_new_wallet_modal: false,
      create_from_keys_modal: false,
      open_from_existing_modal: false,
      balance_modal_active: false,
      instructions_modal_active: false,
      fee_modal: false,
      confirm_modal: false,
      alert: false,
      alert_text: "",
      alert_close_disabled: false,

      //balance settings
      balance: 0,
      unlocked_balance: 0,
      tokens: 0,
      unlocked_tokens: 0,
      sfx_price: 0,
      sft_price: 0,
      balance_wallet: "",
      balance_view_key: "",
      balance_spend_key: "",
      send_cash_or_token: false,
      tick_handle: null,
      tx_being_sent: false,
      fee: 0,

      //wallet state settings
      wallet: {
        address: "",
        spend_key: "",
        view_key: "",
        wallet_connected: "",
        balance: 0,
        unlocked_balance: 0,
        tokens: 0,
        unlocked_tokens: 0,
        blockchain_height: 0
      },
      wallet_being_created: false,
      wallet_loaded: false,
      wallet_password: "",
      filepath: ""
    };

    this.wallet_meta = null;
    this.tx = null;
  }

  //first step select wallet path, if exists, set password
  //second step set password

  //paste in address start mining
  //create new
  //import -> keys/file

  browseFile = () => {
    var filepath = "";
    filepath = dialog.showOpenDialog({});
    this.setState({ filepath });
  };

  createNewWallet = e => {
    create_new_wallet(this, e);
  };

  createNewWalletFromKeys = e => {
    create_new_wallet_from_keys(this, e);
  };

  openWalletFile = e => {
    open_from_wallet_file(this, e);
  };

  addressChange = e => {
    let address = e.target.value;
    this.setState({ mining_info: false, wallet: { address } });
  };

  closeWallet = () => {
    if (this.state.wallet_loaded) {
      this.wallet_meta.pauseRefresh();
      this.wallet_meta.off();
      this.wallet_meta.close(true);
      this.setState({ wallet_loaded: false });
      clearTimeout(this.state.tick_handle);
    }
  };

  openInfoPopup = message => {
    this.setState({
      mining_info: true,
      mining_info_text: message
    });
  };

  setOpenModal = (modal_type, alert, disabled) => {
    openModal(this, modal_type, alert, disabled);
  };

  setOpenAlert = (alert, disabled = false) => {
    this.setOpenModal("alert", alert, disabled);
  };

  setCloseAlert = () => {
    this.setState({
      alert: false,
      alert_close_disabled: false
    });
  };

  setOpenSendPopup = send_cash_or_token => {
    openSendPopup(this, send_cash_or_token);
  };

  setCloseSendPopup = () => {
    closeSendPopup(this);
  };

  setOpenFeeModal = () => {
    this.setOpenModal("fee_modal", "", false);
  };

  setOpenConfirmModal = (alert, disabled) => {
    this.setOpenModal("confirm_modal", alert, disabled);
  };

  setCloseMyModal = () => {
    this.setState({
      modal: false,
      send_disabled: true
    });
    setTimeout(() => {
      this.setState({
        send_modal: false,
        confirm_modal: false,
        fee_modal: false
      });
    }, 300);
    setTimeout(() => {
      this.setState({
        button_disabled: false
      });
    }, 1000);
  };

  closeModal = () => {
    closeModal(this);
  };

  closeAllModals = () => {
    closeAllModals(this);
  };

  startBalanceCheck = () => {
    balanceCheck(this);
  };

  startRefreshCallback = () => {
    refreshCallback(this);
  };

  startRescanBalance = () => {
    rescanBalance(this);
  };

  setWalletData = () => {
    walletData(this);
  };

  sendCashOrToken = (e, send_cash_or_token) => {
    e.preventDefault();
    let sendingAddressInput = e.target.send_to.value;
    let sendingAddress = sendingAddressInput.replace(/\s+/g, "");
    let amountInput = e.target.amount.value;
    let amount = e.target.amount.value * 10000000000;
    let paymentid = e.target.paymentid.value;
    let paymentidInput = paymentid.replace(/\s+/g, "");
    let mixin = e.target.mixin.value;
    this.setState({ send_cash_or_token });
    if (sendingAddress === "") {
      this.setOpenAlert("Enter destination address");
      return false;
    }
    if (amountInput === "" || isNaN(amountInput)) {
      this.setOpenAlert("Enter valid amount");
      return false;
    }
    if (
      process.env.NODE_ENV !== "development" &&
      !safex.addressValid(sendingAddress, "mainnet")
    ) {
      this.setOpenAlert("Enter valid Safex address");
      return false;
    }
    if (
      process.env.NODE_ENV === "development" &&
      !safex.addressValid(sendingAddress, "testnet")
    ) {
      this.setOpenAlert("Enter valid Safex address");
      return false;
    }
    if (
      (send_cash_or_token === 0 &&
        parseFloat(e.target.amount.value) + parseFloat(0.1) >
          this.state.wallet.unlocked_balance) ||
      this.state.wallet.unlocked_balance < parseFloat(0.1)
    ) {
      this.setOpenAlert(
        "Not enough available Safex Cash to complete the transaction"
      );
      return false;
    }
    if (paymentidInput !== "") {
      if (paymentidInput.length !== 64) {
        this.setOpenAlert("Payment ID should contain 64 characters");
        return false;
      }
      this.setState(() => ({
        tx_being_sent: true
      }));
      this.sendTransaction({
        address: sendingAddress,
        amount: amount,
        paymentId: paymentidInput,
        tx_type: send_cash_or_token,
        mixin: mixin
      });
    } else {
      this.setState(() => ({
        tx_being_sent: true
      }));
      this.sendTransaction({
        address: sendingAddress,
        amount: amount,
        tx_type: send_cash_or_token,
        mixin: mixin
      });
    }
  };

  sendTransaction = args => {
    let wallet = this.wallet_meta;
    wallet
      .createTransaction(args)
      .then(tx => {
        let fee = roundAmount(tx.fee());
        this.setState(() => ({
          fee: fee,
          send_tx_disabled: false,
          tx_being_sent: false
        }));
        this.tx = tx;
        this.setOpenFeeModal();
        localStorage.setItem("args", JSON.stringify(args));
        console.log(args);
      })
      .catch(e => {
        this.setState({
          send_tx_disabled: false
        });
        if (e.startsWith("not enough money to transfer, available only")) {
          this.setOpenAlert(
            "There is not enough SFX or outputs available to fulfil this transaction + fee. Please consider reducing the size of the transaction.",
            false
          );
        } else {
          this.setState(() => ({
            send_tx_disabled: false,
            tx_being_sent: false
          }));
          this.setOpenAlert("" + e, false);
        }
        console.log("" + e);
      });
  };

  commitTx = e => {
    e.preventDefault();
    let tx = this.tx;
    let txId = tx.transactionsIds();

    this.setState(() => ({
      tx_being_sent: true,
      alert_close_disabled: true
    }));
    tx.commit()
      .then(() => {
        if (!txId) {
          this.setOpenAlert("Unable to create transaction id ", false);
          return false;
        }
        this.setState({
          tx_being_sent: false,
          alert_close_disabled: false
        });
        if (this.state.send_cash_or_token === 0) {
          this.setOpenConfirmModal(
            "Transaction commited successfully, Your cash transaction ID is: " +
              txId,
            false
          );
          this.tx = null;
        } else {
          this.setOpenConfirmModal(
            "Transaction commited successfully, Your token transaction ID is: " +
              txId,
            false
          );
          this.tx = null;
        }
        setTimeout(() => {
          this.setWalletData();
          this.setState({
            mixin: 6
          });
          console.log("reset mixin " + this.state.mixin);
          localStorage.removeItem("args");
        }, 300);
      })
      .catch(e => {
        this.setState(() => ({
          tx_being_sent: false,
          alert_close_disabled: false
        }));
        this.setOpenAlert("" + e, false);
      });
  };

  handleSubmit = e => {
    e.preventDefault();
    if (this.state.wallet_loaded) {
      this.setWalletData();
    }
    let miningAddress = e.target.mining_address.value;
    if (miningAddress === "") {
      this.openInfoPopup("Please enter Safex address or load wallet");
      return false;
    }
    if (!inputValidate(miningAddress)) {
      this.openInfoPopup("Please enter valid Safex address");
      return false;
    }
    if (!checkInputValueLenght(miningAddress)) {
      this.openInfoPopup("Please enter valid address");
      return false;
    }
    if (!checkInputValuePrefix(miningAddress)) {
      this.openInfoPopup("Your address must start with Safex or SFXt");
      return false;
    }
    if (
      process.env.NODE_ENV !== "development" &&
      !safex.addressValid(miningAddress, "mainnet")
    ) {
      this.openInfoPopup("Address is not valid");
      return false;
    }
    if (this.state.wallet.wallet_connected === false) {
      this.openInfoPopup("No connection to daemon");
      return false;
    }
    if (this.state.active) {
      miningStop(this);
    } else {
      miningStart(this);
    }
  };

  checkStatus = () => {
    this.setState({ hashrate: this.miner.getStatus().split(" ")[2] });
    console.log(this.miner.getStatus(), this.state.hashrate);
  };

  footerLink = () => {
    shell.openExternal("https://www.safex.io/");
  };

  closeApp = () => {
    let window = remote.getCurrentWindow();
    if (this.state.active) {
      miningStop(this);
      this.closeWallet();
      setTimeout(() => {
        window.close();
      }, 5000);
    } else {
      window.close();
    }
  };

  renderButton = ({
    type,
    title,
    content,
    classes,
    disabled,
    tooltip_text
  }) => (
    <div className="button-wrap" key={type}>
      <button
        className={classes.join(" ")}
        onClick={this.setOpenModal.bind(this, type)}
        disabled={disabled}
      >
        {content.startsWith("images/") ? (
          <div>
            <span data-tip data-for={title} />
            <img src={content} alt={content} />
          </div>
        ) : (
          <div>
            <span data-tip data-for={title} />
            {content}
          </div>
        )}
      </button>
      <ReactTooltip id={title}>
        <div>
          <p>{tooltip_text}</p>
          <p className={disabled ? "" : "hidden"}>
            (disabled when wallet is loaded)
          </p>
        </div>
      </ReactTooltip>
    </div>
  );

  fetchPrice = () => {
    axios({
      method: "get",
      url: "https://api.coingecko.com/api/v3/coins/safex-cash"
    })
      .then(res => {
        var sfx_price = parseFloat(
          res.data.market_data.current_price.usd
        ).toFixed(4);
        this.setState({ sfx_price });
      })
      .catch(function(error) {
        console.log(error);
      });

    axios({
      method: "get",
      url: "https://api.coingecko.com/api/v3/coins/safex-token"
    })
      .then(res => {
        var sft_price = parseFloat(
          res.data.market_data.current_price.usd
        ).toFixed(4);
        this.setState({ sft_price });
      })
      .catch(function(error) {
        console.log(error);
      });
  };

  render() {
    let cpu_options = [];
    for (var i = 25; i <= 100; i += 25) {
      cpu_options.push(
        <option key={i} value={i}>
          {i}%
        </option>
      );
    }
    cpu_options.reverse();

    const pools_list = this.pools_list.map((pools_list, index) => (
      <option key={index} value={pools_list} id={index}>
        {pools_list}
      </option>
    ));

    const buttons = [
      {
        type: "new_wallet_modal",
        title: "generate-new-wallet-tooltip",
        content: "images/new.png",
        classes: ["modal-btn"],
        disabled: false,
        tooltip_text: "Generate New Wallet"
      },
      {
        type: "create_new_wallet_modal",
        title: "create-new-wallet-file-tooltip",
        content: "images/new-wallet.png",
        classes: ["modal-btn"],
        disabled:
          this.state.wallet_loaded || this.state.active || this.state.stopping,
        tooltip_text: "Create New Wallet File"
      },
      {
        type: "open_from_existing_modal",
        title: "open-wallet-file-tooltip",
        content: "images/open-logo.png",
        classes: ["modal-btn"],
        disabled:
          this.state.wallet_loaded || this.state.active || this.state.stopping,
        tooltip_text: "Open Wallet File"
      },
      {
        type: "create_from_keys_modal",
        title: "create-new-wallet-from-keys-tooltip",
        content: "images/create-from-keys.png",
        classes: ["modal-btn"],
        disabled:
          this.state.wallet_loaded || this.state.active || this.state.stopping,
        tooltip_text: "Recover Wallet File From Keys"
      },
      {
        type: "balance_modal_active",
        title: "check-balance-tooltip",
        content: "images/key.png",
        classes: ["modal-btn"],
        disabled: false,
        tooltip_text: "Check Balance"
      },
      {
        type: "instructions_modal_active",
        title: "instructions-tooltip",
        content: "?",
        classes: ["modal-btn", "instructions-btn"],
        disabled: false,
        tooltip_text: "Instructions"
      }
    ];

    return (
      <div className="mining-app-wrap">
        <div className="mining-bg-wrap animated fadeIn">
          <img
            className={`ring-outer ${addClass(
              this.state.active || this.state.stopping,
              "rotatingLeft"
            )}`}
            src="images/ring-outer.png"
            alt="Ring outer"
          />
          <img
            className={`ring-inner ${addClass(
              this.state.active || this.state.stopping,
              "rotatingRight"
            )}`}
            src="images/ring-inner.png"
            alt="Ring inner"
          />
          <img
            className={`ring-center ${addClass(
              this.state.active || this.state.stopping,
              "rotatingRight"
            )}`}
            src="images/ring-center.png"
            alt="Ring center"
          />
          <img
            className={`circles ${
              this.state.active || this.state.stopping ? "rotatingRight" : ""
            }`}
            src="images/circles.png"
            alt="Circles"
          />
        </div>

        <div className="mining-app-inner">
          <Header openExitModal={this.openExitModal} closeApp={this.closeApp} />

          <div className="main animated fadeIn">
            <div className="btns-wrap">{buttons.map(this.renderButton)}</div>

            <form onSubmit={this.handleSubmit}>
              <div className="address-wrap">
                <img src="images/line-left.png" alt="Line Left" />
                <div id="address-inner" data-tip data-for="address-tooltip">
                  <input
                    type="text"
                    value={this.state.wallet.address}
                    onChange={this.addressChange}
                    placeholder="Safex Address"
                    name="mining_address"
                    id="mining_address"
                    readOnly={this.state.wallet_loaded ? "readOnly" : ""}
                  />
                  <ReactTooltip id="address-tooltip">
                    {this.state.wallet_loaded ? (
                      <div>
                        <p>
                          This is{" "}
                          <span className="yellow-text">Public Address</span> of
                          your wallet.
                        </p>
                        <p className="mb-10">
                          Public Address starts with Safex and contains between{" "}
                          <span className="yellow-text">95 and 105</span>{" "}
                          characters.
                        </p>
                        <p>
                          This is address where you can receive{" "}
                          <span className="yellow-text">Safex Cash (SFX)</span>{" "}
                          or{" "}
                          <span className="yellow-text">
                            Safex Tokens (SFT)
                          </span>
                          .
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p>You can always enter your own safex address.</p>
                        <p>
                          Or load wallet to view your{" "}
                          <span className="yellow-text">Public Address</span>.
                        </p>
                      </div>
                    )}
                  </ReactTooltip>
                </div>
                <img src="images/line-right.png" alt="Line Right" />
              </div>

              <div id="select-wrap">
                <div id="select-inner" data-tip data-for="pools-tooltip">
                  <select
                    className={
                      this.state.active || this.state.stopping
                        ? "button-shine pool-url disabled"
                        : "button-shine pool-url"
                    }
                    name="pool"
                    id="pool"
                  >
                    {pools_list}
                  </select>
                  <ReactTooltip id="pools-tooltip">
                    {this.state.active || this.state.stopping ? (
                      <div>
                        <p>
                          Choose the <span className="yellow-text">pool</span>{" "}
                          you want to connect to
                        </p>
                        <p>(disabled while mining)</p>
                      </div>
                    ) : (
                      <p>
                        Choose the <span className="yellow-text">pool</span> you
                        want to connect to
                      </p>
                    )}
                  </ReactTooltip>
                </div>
              </div>

              <div className="options">
                <div className="input-group" data-tip data-for="cpu-tooltip">
                  <p># CPU</p>
                  <select
                    name="cores"
                    id="cpuUsage"
                    className={
                      this.state.active || this.state.stopping
                        ? "cpuUsage disabled"
                        : "cpuUsage"
                    }
                  >
                    {cpu_options}
                  </select>
                </div>
                <ReactTooltip id="cpu-tooltip">
                  {this.state.active || this.state.stopping ? (
                    <div>
                      <p>
                        Choose how much{" "}
                        <span className="yellow-text">CPU power</span>{" "}
                      </p>
                      <p>you want to use for mining</p>
                      <p>(disabled while mining)</p>
                    </div>
                  ) : (
                    <div>
                      <p>
                        Choose how much{" "}
                        <span className="yellow-text">CPU power</span>{" "}
                      </p>
                      <p>you want to use for mining</p>
                    </div>
                  )}
                </ReactTooltip>
              </div>
              {this.state.active ? (
                <button
                  type="submit"
                  className="submit button-shine active"
                  disabled={this.state.starting ? "disabled" : ""}
                >
                  <span>{this.state.starting ? "Starting" : "Stop"}</span>
                </button>
              ) : (
                <div>
                  {
                    <button
                      type="submit"
                      className={`submit button-shine ${
                        this.state.stopping ? "active" : ""
                      }`}
                      disabled={
                        this.state.active || this.state.stopping
                          ? "disabled"
                          : ""
                      }
                    >
                      <span>{this.state.stopping ? "Stopping" : "Start"}</span>
                    </button>
                  }
                </div>
              )}
              <p
                className={`mining-info ${
                  this.state.mining_info ? " active" : ""
                }`}
              >
                {this.state.mining_info_text}
              </p>
            </form>

            <div className="hashrate">
              <p className="blue-text">
                <span data-tip data-for="hashrate-tooltip">
                  hashrate:
                </span>
              </p>
              <ReactTooltip id="hashrate-tooltip">
                <p>
                  <span className="yellow-text">Hashrate</span> determines your
                  mining speed.
                </p>
                <p>Mining will be faster with higher hashrate.</p>
              </ReactTooltip>

              <p className="white-text">{this.state.hashrate} H/s</p>
            </div>
          </div>

          <footer className="animated fadeIn">
            <button onClick={this.footerLink} data-tip data-for="safex-tooltip">
              <img src="images/safex-logo.png" alt="Powered by Safex" />
            </button>
            <ReactTooltip id="safex-tooltip">
              <p>
                Visit <span className="yellow-text">Safex website</span>
              </p>
            </ReactTooltip>
          </footer>

          <Modal
            modal={this.state.modal}
            newWalletModal={this.state.new_wallet_modal}
            closeModal={this.closeModal}
            instructionsModalActive={this.state.instructions_modal_active}
            createNewWalletModal={this.state.create_new_wallet_modal}
            createNewWallet={this.createNewWallet}
            browseFile={this.browseFile}
            openFromExistingModal={this.state.open_from_existing_modal}
            openWalletFile={this.openWalletFile}
            filepath={this.state.filepath}
            openCreateFromKeysModal={this.state.create_from_keys_modal}
            createNewWalletFromKeys={this.createNewWalletFromKeys}
            wallet={this.state.wallet}
            balanceModalActive={this.state.balance_modal_active}
            walletLoaded={this.state.wallet_loaded}
            startRescanBalance={this.startRescanBalance}
            setOpenSendPopup={this.setOpenSendPopup}
            setCloseSendPopup={this.setCloseSendPopup}
            sendModal={this.state.send_modal}
            send_cash_or_token={this.state.send_cash_or_token}
            sendCashOrToken={this.sendCashOrToken}
            closeSendPopup={this.setCloseSendPopup}
            txBeingSent={this.state.tx_being_sent}
            availableCash={this.state.wallet.unlocked_balance}
            availableTokens={this.state.wallet.unlocked_tokens}
            alert={this.state.alert}
            alertText={this.state.alert_text}
            alertCloseDisabled={this.state.alert_close_disabled}
            sfxPrice={this.state.sfx_price}
            sftPrice={this.state.sft_price}
            mixin={this.state.mixin}
            confirmModal={this.state.confirm_modal}
            feeModal={this.state.fee_modal}
            fee={this.state.fee}
            setCloseMyModal={this.setCloseMyModal}
            commitTx={this.commitTx}
          />
        </div>
      </div>
    );
  }
}
