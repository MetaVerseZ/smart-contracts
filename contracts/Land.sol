// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract Land is ERC721 {
	uint256 public _tokenId;

	struct Item {
		bool minted;
		uint256 id;
	}

	mapping(uint8 => mapping(uint8 => Item)) public _coordinates;

	address public _market = address(0);
	address[] public _admins;

	event Minted(address owner, uint256 tokenId, uint8 x, uint8 y);

	constructor() ERC721('Meta Z Land', 'MZL') {
		_admins = [msg.sender];
	}

	function mint(uint8 x, uint8 y) public {
		require(isAdmin(msg.sender), 'only admin');
		require(_market != address(0), 'market undefined');
		require(!_coordinates[x][y].minted, 'land already minted');

		_safeMint(msg.sender, _tokenId);
		setApprovalForAll(_market, true);

		_coordinates[x][y] = Item(true, _tokenId);
		_tokenId++;

		emit Minted(msg.sender, _tokenId - 1, x, y);
	}

	function burn(uint256 tokenId) public {
		require(ERC721.ownerOf(tokenId) == msg.sender, 'only owner can burn');
		super._burn(tokenId);
	}

	function setMarket(address _marketAddress) public {
		require(isAdmin(msg.sender), 'not admin');
		_market = _marketAddress;
		setApprovalForAll(_market, true);
	}

	function _baseURI() internal pure override returns (string memory) {
		return 'ipfs://';
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
