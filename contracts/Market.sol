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

	enum ListingStatus {
		Listed,
		NotListed
	}

	struct Listing {
		ListingStatus status;
		address owner;
		uint256 id;
		uint256 price;
	}

	event Listed(uint256 listingId, address owner, uint256 id, uint256 price);
	event Unlisted(uint256 listingId, address owner);
	event Sold(uint256 listingId, address buyer, uint256 id, uint256 price);

	uint256 public _totalNumberOfListings;
	uint256 public _numberOfSoldItems;

	mapping(uint256 => Listing) public _listings;

	function listToken(uint256 id, uint256 price) public {
		require(_mzt.balanceOf(msg.sender) >= _listingFee, 'balance too low for listing fee');
		require(msg.sender == _item.ownerOf(id), 'listing can be done only by owner');

		Listing memory listing = Listing(ListingStatus.Listed, msg.sender, id, price);
		_listings[id] = listing;

		_mzt.transferFrom(msg.sender, address(this), _listingFee);

		emit Listed(id, msg.sender, id, price);

		if (id >= _totalNumberOfListings) {
			_totalNumberOfListings++;
		}
	}

	function buyToken(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender != listing.owner, 'owner cannot be buyer');
		require(listing.status == ListingStatus.Listed, 'listing is not active');

		_mzt.transferFrom(msg.sender, address(this), listing.price);
		_mzt.approve(listing.owner, listing.price);
		_mzt.transfer(listing.owner, listing.price);

		_item.transferFrom(listing.owner, msg.sender, listing.id);

		listing.status = ListingStatus.NotListed;
		listing.owner = msg.sender;

		_numberOfSoldItems++;

		emit Sold(listingId, msg.sender, listing.id, listing.price);
	}

	function cancel(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender == listing.owner, 'only owner can cancel listing');
		require(listing.status == ListingStatus.Listed, 'listing is not active');

		_mzt.transfer(msg.sender, _listingFee);

		listing.status = ListingStatus.NotListed;

		emit Unlisted(listingId, listing.owner);
	}

	function getListing(uint256 listingId) public view returns (Listing memory) {
		return _listings[listingId];
	}

	function getAllListings() public view returns (Listing[] memory) {
		Listing[] memory ret = new Listing[](_totalNumberOfListings);
		for (uint256 i = 0; i < _totalNumberOfListings; i++) {
			ret[i] = _listings[i];
		}
		return ret;
	}

	function getListedItems() public view returns (Listing[] memory) {
		Listing[] memory l = getAllListings();
		uint256 n = numberOfListedItems();

		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;

		for (uint256 i = 0; i < _totalNumberOfListings; i++) {
			if (l[i].status == ListingStatus.Listed) {
				ret[current] = l[i];
				current++;
			}
		}
		return ret;
	}

	function getUnlistedItems() public view returns (Listing[] memory) {
		Listing[] memory l = getAllListings();
		uint256 n = _totalNumberOfListings - numberOfListedItems();

		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;

		for (uint256 i = 0; i < _totalNumberOfListings; i++) {
			if (l[i].status == ListingStatus.NotListed) {
				ret[current] = l[i];
				current++;
			}
		}
		return ret;
	}

	function numberOfListedItems() public view returns (uint256) {
		Listing[] memory l = getAllListings();
		uint256 num = 0;
		for (uint256 i = 0; i < _totalNumberOfListings; i++) {
			if (l[i].status == ListingStatus.Listed) {
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
}
