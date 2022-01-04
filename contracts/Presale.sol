// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';

contract Presale {
	Token _token;
	address payable public _admin;
	uint256 public _round;

	constructor(address tokenAddress, address payable adminAddress) {
		_token = Token(tokenAddress);
		_admin = adminAddress;
		_round = 0;
	}

	receive() external payable {
		getTokens(msg.sender);
	}

	function getTokens(address beneficiary) public payable {
		require(_round > 0, 'presale inactive');
		uint256 value = msg.value * (600000 - (_round - 1) * 100000);
		require(value <= _token.balanceOf(address(this)), 'amount is larger than token balance');
		_token.approve(beneficiary, value);
		_token.transfer(beneficiary, value);
		_admin.transfer(msg.value);
	}

	function withdrawAll() public {
		require(msg.sender == _admin, 'not admin');
		_token.approve(_admin, _token.balanceOf(address(this)));
		_token.transfer(_admin, _token.balanceOf(address(this)));
	}

	function withdraw(uint256 amount) public {
		require(msg.sender == _admin, 'not admin');
		require(amount <= _token.balanceOf(address(this)), 'amount is larger than token balance');
		_token.approve(_admin, amount);
		_token.transfer(_admin, amount);
	}

	function setRound(uint256 round) public {
		require(msg.sender == _admin, 'not admin');
		require(round <= 3, 'round must be less than 3');
		_round = round;
	}
}
