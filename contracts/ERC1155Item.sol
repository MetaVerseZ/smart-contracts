// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';

contract Item is ERC1155 {
	uint256 public _tokenId = 0;

	address public _market = address(0);
	address[] public _admins;

	mapping(uint256 => string) private _tokenURIs;

	event Minted(address owner, uint256 tokenId, uint256 amount);

	constructor(string memory _uri) ERC1155(_uri) {
		_admins = [msg.sender];
	}

	function mint(uint256 amount) public {
		require(isAdmin(msg.sender), 'only admin');
		require(_market != address(0), 'market undefined');
		require(amount > 0);

		_mint(msg.sender, _tokenId, amount, '');
		setApprovalForAll(_market, true);

		_tokenId++;

		emit Minted(msg.sender, _tokenId, amount);
	}

	function isAdmin(address account) public view returns (bool) {
		for (uint256 i = 0; i < _admins.length; i++) {
			if (_admins[i] == account) {
				return true;
			}
		}
		return false;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_admins = admins;
	}

	function setMarket(address market) public {
		require(isAdmin(msg.sender), 'not admin');
		_market = market;
		setApprovalForAll(_market, true);
	}
}
