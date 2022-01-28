// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Token.sol';
import './Item.sol';

contract Market {
	Token public _mzt;
	Item public _item;
	address public _admin;
	uint256 public _listingFee;

	constructor(
		address mztAddress,
		address itemAddress,
		address adminAddress
	) {
		_mzt = Token(mztAddress);
		_item = Item(itemAddress);
		_admin = adminAddress;
		_listingFee = 1000 ether;
	}

	struct Listing {
		uint256 id;
		uint256 price;
		address owner;
	}

	event Listed(uint256 listingId, address owner, uint256 id, uint256 price);
	event Unlisted(uint256 listingId, address owner);
	event Sold(uint256 listingId, address buyer, uint256 id, uint256 price);

	uint256 public _numberOfSales;

	mapping(uint256 => Listing) public _listings;

	function listItem(uint256 id, uint256 price) public {
		require(id < _item._tokenId(), 'item not minted');
		require(_mzt.balanceOf(msg.sender) >= _listingFee, 'balance too low for listing fee');
		require(msg.sender == _item.ownerOf(id), 'listing can be done only by owner');
		require(_listings[id].owner == address(0), 'item already listed');

		_listings[id] = Listing(id, price, msg.sender);

		_mzt.transferFrom(msg.sender, address(this), _listingFee);

		emit Listed(id, msg.sender, id, price);
	}

	function buyItem(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender != listing.owner, 'owner cannot be buyer');
		require(listing.owner != address(0), 'listing is not active');

		_mzt.transferFrom(msg.sender, address(this), listing.price);
		_mzt.approve(listing.owner, listing.price);
		_mzt.transfer(listing.owner, listing.price);

		_item.transferFrom(listing.owner, msg.sender, listing.id);

		listing.owner = msg.sender;

		_numberOfSales++;

		delete _listings[listingId];

		emit Sold(listingId, msg.sender, listing.id, listing.price);
	}

	function cancel(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender == listing.owner, 'only owner can cancel listing');
		require(listing.owner != address(0), 'listing is not active');

		_mzt.transfer(msg.sender, _listingFee);

		delete _listings[listingId];

		emit Unlisted(listingId, listing.owner);
	}

	function getListing(uint256 listingId) public view returns (Listing memory) {
		return _listings[listingId];
	}

	function listings() public view returns (Listing[] memory) {
		uint256 n = numberOfListedItems();
		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _item._tokenId(); i++) {
			if (_listings[i].owner != address(0)) {
				ret[current] = _listings[i];
				current++;
			}
		}
		return ret;
	}

	function unlisted() public view returns (uint256[] memory) {
		uint256 n = _item._tokenId() - numberOfListedItems();
		uint256[] memory ret = new uint256[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _item._tokenId(); i++) {
			if (_listings[i].owner == address(0)) {
				ret[current] = i;
				current++;
			}
		}
		return ret;
	}

	function numberOfListedItems() public view returns (uint256) {
		Listing[] memory l = new Listing[](_item._tokenId());
		for (uint256 i = 0; i < _item._tokenId(); i++) {
			l[i] = _listings[i];
		}

		uint256 num = 0;
		for (uint256 i = 0; i < _item._tokenId(); i++) {
			if (l[i].owner != address(0)) {
				num++;
			}
		}
		return num;
	}

	function withdrawAll() public {
		require(msg.sender == _admin, 'not admin');
		require(_mzt.balanceOf(address(this)) > (numberOfListedItems() * _listingFee), 'leave fees for unsold items');
		_mzt.approve(_admin, _mzt.balanceOf(address(this)) - numberOfListedItems() * _listingFee);
		_mzt.transfer(_admin, _mzt.balanceOf(address(this)) - numberOfListedItems() * _listingFee);
	}

	function withdraw(uint256 amount) public {
		require(msg.sender == _admin, 'not admin');
		require((_mzt.balanceOf(address(this)) - amount) > (numberOfListedItems() * _listingFee), 'leave fees for unsold items');
		require(amount <= _mzt.balanceOf(address(this)), 'amount is larger than token balance');
		_mzt.approve(_admin, amount);
		_mzt.transfer(_admin, amount);
	}

	function setListingFee(uint256 amount) public {
		require(msg.sender == _admin, 'not admin');
		_listingFee = amount;
	}

	function getAccountItems(address account) public view returns (uint256[] memory) {
		uint256 ownedItems = 0;
		uint256 _tokenId = _item._tokenId();
		for (uint256 i = 0; i < _tokenId; i++) {
			if (_item.ownerOf(i) == account) {
				ownedItems++;
			}
		}

		uint256[] memory ret = new uint256[](ownedItems);
		uint256 retIndex = 0;
		for (uint256 i = 0; i < _tokenId; i++) {
			if (_item.ownerOf(i) == account) {
				ret[retIndex] = i;
				retIndex++;
			}
		}
		return ret;
	}
}
