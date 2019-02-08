import React from "react";

export default class BalanceAlert extends React.Component {
  render() {
    return (
      <div>
        <div
          className={`balanceAlert ${this.props.balanceAlert ? "active" : ""}`}
        >
          <div className="mainAlertPopupInner">
            <p>{this.props.balanceAlertText}</p>
            {this.props.balanceAlertCloseDisabled ? (
              <span className="hidden" />
            ) : (
              <span className="close" onClick={this.props.closeBalanceAlert}>
                X
              </span>
            )}
          </div>
        </div>

        <div
          className={`balanceAlertBackdrop ${
            this.props.balanceAlert ? "active" : ""
          }`}
          onClick={this.props.closeBalanceAlert}
        />
      </div>
    );
  }
}
