// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './ERC721ItemInterface.sol';

contract Item is ERC721Item {
	constructor() ERC721('Meta Z Land', 'MZL') {
		_admins = [msg.sender];
	}

	function mint(string memory uri) public override {
		require(isAdmin(msg.sender), 'only admin');

		_safeMint(msg.sender, _tokenId);
		_setTokenURI(_tokenId, uri);
		if (_market != address(0)) setApprovalForAll(_market, true);

		_tokenId++;

		emit Minted(msg.sender, _tokenId - 1);
	}

	function isAdmin(address account) public view override returns (bool) {
		for (uint256 i = 0; i < _admins.length; i++) {
			if (_admins[i] == account) {
				return true;
			}
		}
		return false;
	}

	function setAdmins(address[] memory admins) public override {
		require(isAdmin(msg.sender), 'admin only');
		_admins = admins;
	}

	function setMarket(address _marketAddress) public override {
		require(isAdmin(msg.sender), 'not admin');
		_market = _marketAddress;
		setApprovalForAll(_market, true);
	}
}
