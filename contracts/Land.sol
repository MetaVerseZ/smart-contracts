// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract Land is ERC721 {
	uint32 public _tokenId;
	uint32 public _supply = 65536;

	struct Coordinates {
		address owner;
		uint8 x;
		uint8 y;
	}

	struct Item {
		bool minted;
		uint256 id;
	}

	Coordinates[] public _coordinates;
	mapping(uint8 => mapping(uint8 => Item)) public _items;

	address public _market = address(0);
	address[] public _admins;

	event Minted(address owner, uint256 tokenId, uint8 x, uint8 y);

	constructor() ERC721('Meta Z Land', 'MZL') {
		_admins = [msg.sender];
	}

	function mint(uint8 x, uint8 y) public {
		require(_tokenId <= _supply, 'reached total supply');
		require(isAdmin(msg.sender), 'only admin');
		require(!_items[x][y].minted, 'land already minted');

		_safeMint(msg.sender, _tokenId);
		if (_market != address(0)) setApprovalForAll(_market, true);

		_items[x][y] = Item(true, _tokenId);
		_coordinates.push(Coordinates(msg.sender, x, y));

		_tokenId++;

		emit Minted(msg.sender, _tokenId - 1, x, y);
	}

	function burn(uint256 tokenId) public {
		require(ERC721.ownerOf(tokenId) == msg.sender, 'only owner can burn');

		_coordinates[tokenId].owner = address(0);
		super._burn(tokenId);
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

	function setMarket(address _marketAddress) public {
		require(isAdmin(msg.sender), 'not admin');
		_market = _marketAddress;
		setApprovalForAll(_market, true);
	}

	function batchMint(
		uint8 start,
		uint8 xEnd,
		uint8 yEnd
	) public {
		require(isAdmin(msg.sender), 'only admin');
		require(start <= xEnd && start <= yEnd, 'start must be lower than end');

		for (uint8 x = start; x <= xEnd; x++) {
			for (uint8 y = start; y <= yEnd; y++) {
				if (!_items[x][y].minted) mint(x, y);
			}
		}
	}

	function map() public view returns (Coordinates[] memory) {
		return _coordinates;
	}

	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) public virtual override {
		//solhint-disable-next-line max-line-length
		require(_isApprovedOrOwner(_msgSender(), tokenId), 'ERC721: transfer caller is not owner nor approved');

		_coordinates[tokenId].owner = to;
		_transfer(from, to, tokenId);
	}

	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId,
		bytes memory _data
	) public virtual override {
		require(_isApprovedOrOwner(_msgSender(), tokenId), 'ERC721: transfer caller is not owner nor approved');

		_coordinates[tokenId].owner = to;
		_safeTransfer(from, to, tokenId, _data);
	}
}
