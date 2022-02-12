// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';

contract TimelockMulti {
	uint256[] public _durations = [1 days, 2 days, 3 days];
	uint256[] public _amounts = [20000000 ether, 25000000 ether, 30000000 ether];
	bool[] public _withdrawn;
	uint256[] public _end;
	address public immutable _deployer;
	address[] public _owners;
	Token _token;

	constructor(address token, address[] memory owners) {
		for (uint256 i = 0; i < _durations.length; i++) {
			_end.push(block.timestamp + _durations[i]);
			_withdrawn.push(false);
		}
		_deployer = msg.sender;
		_token = Token(token);
		_owners = owners;
	}

	function withdraw() public {
		require(isOwner(msg.sender), 'owner only');
		require(block.timestamp >= _end[0], 'too early');

		uint256 amount = 0;
		bool early = false;
		for (uint256 i = 0; i < _end.length; i++) {
			if (block.timestamp < _end[i]) {
				early = true;
				break;
			}
			if (!_withdrawn[i]) {
				amount += _amounts[i];
				_withdrawn[i] = true;
			}
		}

		require(amount > 0 || !early, 'cannot withdraw right now');
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
