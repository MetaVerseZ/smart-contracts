// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';

contract Timelock {
	uint256 public constant _duration = 1 days;
	uint256 public immutable _end;
	address public immutable _receiver;
	Token _token;

	constructor(address token) {
		_end = block.timestamp + _duration;
		_receiver = msg.sender;
		_token = Token(token);
	}

	function withdraw() public {
		require(msg.sender == _receiver, 'receiver only');
		require(block.timestamp >= _end, 'too early');
		uint256 amount = _token.balanceOf(address(this));
		_token.approve(_receiver, amount);
		_token.transfer(_receiver, amount);
	}
}
