function updatedCallback(target) {
  console.log("UPDATED");
  target.state.wallet_meta.store()
    .then(() => {
      console.log("Wallet stored");
      target.setCloseAlert();
    })
    .catch(e => {
      console.log("Unable to store wallet: " + e);
    });
}

function refreshCallback(target) {
  console.log("wallet refreshed");
  let wallet = target.state.wallet_meta;
  target.setWalletData();
  wallet.store()
    .then(() => {
      console.log("Wallet stored");
      target.setCloseAlert();
    })
    .catch(e => {
      console.log("Unable to store wallet: " + e);
      target.setOpenAlert("Unable to store wallet: " + e);
    });
  wallet.off("refreshed");
  setTimeout(() => {
    wallet.on("newBlock", target.startNewBlockCallback);
    wallet.on("updated", target.startUpdatedCallback);
  }, 300);
}

function newBlockCallback(target, height) {
  let wallet = target.state.wallet_meta;
  let syncedHeight = wallet.daemonBlockchainHeight() - height < 10;
  if (syncedHeight) {
    console.log("syncedHeight up to date...");
    if (wallet.synchronized()) {
      console.log("newBlock wallet synchronized, setting state...");
      target.setWalletData();
    }
  }
}

function balanceCheck(target) {
  if (target.state.wallet_loaded) {
    let wallet = target.state.wallet_meta;
    console.log("daemon blockchain height: " + wallet.daemonBlockchainHeight());
    console.log("blockchain height: " + wallet.blockchainHeight());
    target.setOpenAlert("Please wait while wallet file is loaded...", true);
    if (target.state.wallet_loaded) {
      target.setWalletData();
      console.log("balance: " + roundAmount(Math.abs(wallet.balance() - wallet.unlockedBalance())));
      console.log("unlocked balance: " + roundAmount(wallet.unlockedBalance()));
      console.log("token balance: " + roundAmount(Math.abs(wallet.tokenBalance() - wallet.unlockedTokenBalance())));
      console.log("unlocked token balance: " + roundAmount(wallet.unlockedTokenBalance()));
      console.log("blockchain height " + wallet.blockchainHeight());
      console.log("connected: " + wallet.connected());
    }
    target.setState(() => ({ wallet: { wallet_sync: false }}));
    if (wallet.daemonBlockchainHeight() - wallet.blockchainHeight() > 10) {
      target.setOpenAlert("Please wait while blockchain is being updated...", true);
    }
    wallet.on("refreshed", target.startRefreshCallback);
    target.setState(() => ({ modal_close_disabled: false }));
  }
}

function rescanBalance(target) {
  let wallet = target.state.wallet_meta;
  target.setOpenAlert("Rescanning, this may take some time, please wait ", true);
  wallet.off("updated");
  wallet.off("newBlock");
  wallet.off("refreshed");
  target.setState({ modal_close_disabled: true });
  setTimeout(() => {
    console.log("Starting blockchain rescan sync...");
    wallet.rescanBlockchain();
    console.log("Blockchain rescan executed...");
    setTimeout(() => {
      console.log("Rescan setting callbacks");
      target.setWalletData();
      target.setCloseAlert();
      wallet.store()
        .then(() => { console.log("Wallet stored") })
        .catch(e => {
          console.log("Unable to store wallet: " + e);
          target.setOpenAlert("Unable to store wallet: " + e);
        });
      wallet.on("newBlock", target.newBlockCallback);
      wallet.on("updated", target.updatedCallback);
    }, 1000);
  }, 1000);
}

function walletData(target) {
  let wallet = target.state.wallet_meta;
  target.setState({
    modal_close_disabled: false,
    alert_close_disabled: false,
    wallet: {
      address: wallet.address(),
      balance: roundAmount(Math.abs(wallet.balance() - wallet.unlockedBalance())),
      unlocked_balance: roundAmount(wallet.unlockedBalance()),
      tokens: roundAmount(Math.abs(wallet.tokenBalance() - wallet.unlockedTokenBalance())),
      unlocked_tokens: roundAmount(wallet.unlockedTokenBalance()),
      blockchain_height: wallet.blockchainHeight(),
      wallet_connected: wallet.connected() === "connected"
    }
  });
}

/**
 * Round amount
 */
function roundAmount(balance) {
  return Math.floor(parseFloat(balance) / 100000000) / 100;
}

export {
  updatedCallback,
  refreshCallback,
  newBlockCallback,
  balanceCheck,
  rescanBalance,
  walletData,
  roundAmount
};
