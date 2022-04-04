// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';

contract Item is ERC1155 {
	uint256 public _tokenId = 0;

	address public _market = address(0);
	address[] public _admins;

	mapping(uint256 => string) private _tokenURIs;

	event Minted(address owner, uint256 tokenId, uint256 amount);

	constructor() ERC1155('Meta Z Item') {
		_admins = [msg.sender];
	}

	function setMarket(address market) public {
		require(isAdmin(msg.sender), 'not admin');
		_market = market;
		setApprovalForAll(_market, true);
	}

	function mint(string memory uri, uint256 amount) public {
		require(_market != address(0), 'market undefined');
		_mint(msg.sender, _tokenId, amount, '');
		_setTokenURI(_tokenId, uri);
		setApprovalForAll(_market, true);
		emit Minted(msg.sender, _tokenId, amount);
		_tokenId++;
	}

	function tokenURI(uint256 tokenId) public view returns (string memory) {
		return _tokenURIs[tokenId];
	}

	function _setTokenURI(uint256 tokenId, string memory uri) private {
		_tokenURIs[tokenId] = uri;
	}

	function isAdmin(address account) public view returns (bool) {
		bool admin = false;
		for (uint256 i = 0; i < _admins.length; i++) {
			if (_admins[i] == account) {
				admin = true;
				break;
			}
		}
		return admin;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_admins = admins;
	}
}
