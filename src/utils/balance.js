function refreshCallback(target) {
  console.log("Wallet refreshed");
  let wallet = target.wallet_meta;

  let syncedHeight =
    wallet.daemonBlockchainHeight() - wallet.blockchainHeight() < 10;
  if (syncedHeight) {
    console.log("syncedHeight up to date...");
    if (wallet.synchronized()) {
      console.log("refreshCallback wallet synchronized, setting state...");
      target.setWalletData();
    }
  }

  wallet
    .store()
    .then(() => {
      console.log("Wallet stored");
      if (target.state.send_modal && target.state.alert) {
        return false;
      } else {
        target.setCloseAlert();
        console.log("wallet stored checkpoint");
      }
    })
    .catch(e => {
      target.setOpenAlert("" + e);
    });
}

function balanceCheck(target) {
  target.fetchPrice();
  if (target.state.wallet_loaded) {
    let wallet = target.wallet_meta;
    target.setOpenAlert(
      "Please wait while blockchain is being updated. Don't close the application until the process is complete. This may take a while, please be patient.",
      true
    );
    target.setWalletData();
    if (wallet.daemonBlockchainHeight() - wallet.blockchainHeight() > 10) {
      target.setOpenAlert(
        "Please wait while blockchain is being updated. Don't close the application until the process is complete. This may take a while, please be patient. ",
        true
      );
    }
    wallet.on("refreshed", target.startRefreshCallback);
  }
}

function rescanBalance(target) {
  let wallet = target.wallet_meta;
  if (target.state.wallet.wallet_connected === false) {
    target.setOpenAlert("No connection to daemon");
    return false;
  }
  target.setOpenAlert(
    "Rescan started. Don't close the application until the process is complete. This may take a while, please be patient. ",
    true
  );
  wallet.off("updated");
  wallet.off("newBlock");
  wallet.off("refreshed");
  setTimeout(() => {
    console.log("Starting blockchain rescan sync...");
    wallet.rescanBlockchain();
    console.log("Blockchain rescan executed...");
    setTimeout(() => {
      console.log("Rescan setting callbacks");
      target.setWalletData();
      target.setCloseAlert();
      wallet
        .store()
        .then(() => {
          console.log("Wallet stored");
        })
        .catch(e => {
          console.log("Unable to store wallet: " + e);
          target.setOpenAlert("Unable to store wallet: " + e);
        });
      wallet.on("newBlock", target.startRefreshCallback);
    }, 1000);
  }, 1000);
}

function walletData(target) {
  let wallet = target.wallet_meta;
  target.setState({
    wallet: {
      address: wallet.address(),
      spend_key: wallet.secretSpendKey(),
      view_key: wallet.secretViewKey(),
      balance: roundAmount(
        Math.abs(wallet.balance() - wallet.unlockedBalance())
      ),
      unlocked_balance: roundAmount(wallet.unlockedBalance()),
      tokens: roundAmount(
        Math.abs(wallet.tokenBalance() - wallet.unlockedTokenBalance())
      ),
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
  refreshCallback,
  balanceCheck,
  rescanBalance,
  walletData,
  roundAmount
};
