// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';

contract Timelock {
	uint256 public constant _duration = 1 days;
	uint256 public immutable _end;
	address public immutable _deployer;
	address[] public _owners;
	Token _token;

	constructor(address token, address[] memory owners) {
		_end = block.timestamp + _duration;
		_deployer = msg.sender;
		_token = Token(token);
		_owners = owners;
	}

	function withdraw() public {
		require(isOwner(msg.sender), 'owner only');
		require(block.timestamp >= _end, 'too early');
		uint256 amount = _token.balanceOf(address(this));
		_token.transfer(msg.sender, amount);
	}

	function isOwner(address account) public view returns (bool) {
		bool owner = account == _deployer;
		if (!owner) {
			for (uint256 i = 0; i < _owners.length; i++) {
				if (_owners[i] == account) {
					owner = true;
					break;
				}
			}
		}
		return owner;
	}

	function setOwners(address[] memory owners) public {
		require(isOwner(msg.sender), 'owner only');
		_owners = owners;
	}
}
