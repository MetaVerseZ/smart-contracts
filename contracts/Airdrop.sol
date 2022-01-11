// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';

contract MZTAirdrop {
	Token _token;
	address public _admin;
	uint256 _value = 0;

	constructor(address _tokenAddress, address _adminAddress) {
		_token = Token(_tokenAddress);
		_admin = _adminAddress;
	}

	event InitAirdrop(uint256 totalAmount, uint256 number, uint256 amountEach);
	event Airdrop(address addr, uint256 value);

	function distribute(address[] memory _addresses) external {
		require(msg.sender == _admin, 'not admin');
		require(_token.balanceOf(address(this)) >= (_addresses.length * 1 ether), 'low balance');

		_value = _token.balanceOf(address(this)) / _addresses.length;

		emit InitAirdrop(_token.balanceOf(address(this)), _addresses.length, _value);

		for (uint256 i = 0; i < _addresses.length; i++) {
			sendTokens(_addresses[i]);
		}

		_value = 0;
	}

	function sendTokens(address to) private {
		_token.approve(to, _value);
		_token.transfer(to, _value);
		emit Airdrop(to, _value);
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
}
