// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import './Token.sol';

contract Market {
	Token _token;
	address _admin;

	constructor(address tokenAddress, address adminAddress) {
		_token = Token(tokenAddress);
		_admin = adminAddress;
	}

	enum ListingStatus {
		Listed,
		NotListed
	}

	struct Listing {
		ListingStatus status;
		address owner;
		address token;
		uint256 id;
		uint256 price;
	}

	event Listed(uint256 listingId, address owner, address token, uint256 id, uint256 price);

	event Sale(uint256 listingId, address buyer, address token, uint256 id, uint256 price);

	event Cancel(uint256 listingId, address owner);

	uint256 public _listingFee = 1000 ether;
	uint256 public _totalNumberOfListings;
	uint256 public _numberOfSoldItems;

	mapping(uint256 => Listing) public _listings;

	function listToken(
		address nft,
		uint256 id,
		uint256 price
	) public {
		require(_token.balanceOf(msg.sender) >= _listingFee, 'balance too low for listing fee');
		require(msg.sender == IERC721(nft).ownerOf(id), 'listing can be done only by owner');

		Listing memory listing = Listing(ListingStatus.Listed, msg.sender, nft, id, price);
		_listings[id] = listing;

		_token.transferFrom(msg.sender, address(this), _listingFee);

		emit Listed(id, msg.sender, nft, id, price);

		if (id >= _totalNumberOfListings) {
			_totalNumberOfListings++;
		}
	}

	function buyToken(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender != listing.owner, 'owner cannot be buyer');
		require(listing.status == ListingStatus.Listed, 'listing is not active');

		_token.transferFrom(msg.sender, address(this), listing.price);
		_token.approve(listing.owner, listing.price);
		_token.transfer(listing.owner, listing.price);

		IERC721(listing.token).transferFrom(listing.owner, msg.sender, listing.id);

		listing.status = ListingStatus.NotListed;
		listing.owner = msg.sender;

		_numberOfSoldItems++;

		emit Sale(listingId, msg.sender, listing.token, listing.id, listing.price);
	}

	function cancel(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender == listing.owner, 'only owner can cancel listing');
		require(listing.status == ListingStatus.Listed, 'listing is not active');

		_token.transfer(msg.sender, _listingFee);

		listing.status = ListingStatus.NotListed;

		emit Cancel(listingId, listing.owner);
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
		require(_token.balanceOf(address(this)) > (numberOfListedItems() * _listingFee), 'leave fees for unsold items');
		_token.approve(_admin, _token.balanceOf(address(this)) - numberOfListedItems() * _listingFee);
		_token.transfer(_admin, _token.balanceOf(address(this)) - numberOfListedItems() * _listingFee);
	}

	function withdraw(uint256 amount) public {
		require(msg.sender == _admin, 'not admin');
		require((_token.balanceOf(address(this)) - amount) > (numberOfListedItems() * _listingFee), 'leave fees for unsold items');
		require(amount <= _token.balanceOf(address(this)), 'amount is larger than token balance');
		_token.approve(_admin, amount);
		_token.transfer(_admin, amount);
	}
}
