// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Market {
	ERC20 public _mzt;
	address[] public _acceptdTokens;
	address[] public _adm;
	uint16 public _lisFee;

	event Listed(address addr, uint256 id, address seller, uint256 amount, uint256 price);
	event Unlisted(address addr, uint256 id, address seller);
	event Sold(address addr, uint256 id, address buyer, uint256 amount, uint256 price);

	function withdrawAll() public {
		require(isAdmin(msg.sender), 'not admin');
		_mzt.transfer(msg.sender, _mzt.balanceOf(address(this)));
	}

	function withdraw(address token, uint256 amount) public {
		require(isAdmin(msg.sender), 'not admin');
		ERC20 _token = ERC20(token);
		require(amount <= _token.balanceOf(address(this)), 'amount is larger than token balance');
		_token.transfer(msg.sender, amount);
	}

	function setListingFee(uint8 amount) public {
		require(isAdmin(msg.sender), 'not admin');
		_lisFee = amount;
	}

	function isAdmin(address account) public view returns (bool) {
		for (uint256 i = 0; i < _adm.length; i++) {
			if (_adm[i] == account) return true;
		}
		return false;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_adm = admins;
	}

	function tokenAccepted(address token) public view returns (bool) {
		for (uint256 i = 0; i < _acceptdTokens.length; i++) {
			if (_acceptdTokens[i] == token) return true;
		}
		return false;
	}

	function setAcceptedTokens(address[] memory tokens) public {
		require(isAdmin(msg.sender), 'admin only');
		_acceptdTokens = tokens;
	}
}
