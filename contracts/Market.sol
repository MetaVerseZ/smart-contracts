// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/utils/Counters.sol';
import './IERC721.sol';

contract Market {
	enum ListingStatus {
		Active,
		Sold,
		Cancelled
	}

	struct Listing {
		ListingStatus status;
		address creator;
		address owner;
		address token;
		uint256 tokenId;
		uint256 price;
	}

	event Listed(uint256 listingId, address creator, address owner, address token, uint256 tokenId, uint256 price);

	event Sale(uint256 listingId, address buyer, address token, uint256 tokenId, uint256 price);

	event Cancel(uint256 listingId, address owner);

	uint256 private _listingId = 0;
	uint256 private _listingPrice = 0.001 ether;
	uint256 private _numberOfListings;
	uint256 private _numberOfSoldItems;

	mapping(uint256 => Listing) private _listings;
	using Counters for Counters.Counter;

	function listToken(
		address token,
		uint256 tokenId,
		uint256 price
	) public payable {
		require(msg.value == _listingPrice, 'Price must be equal to listing price');
		IERC721(token).transferFrom(msg.sender, address(this), tokenId);

		Listing memory listing = Listing(ListingStatus.Active, msg.sender, msg.sender, token, tokenId, price);

		_listings[_listingId] = listing;

		emit Listed(_listingId, msg.sender, msg.sender, token, tokenId, price);
		_numberOfListings++;
		_listingId++;
	}

	function buyToken(uint256 listingId) external payable {
		Listing storage listing = _listings[listingId];

		require(msg.sender != listing.owner, 'Owner cannot be buyer');
		require(listing.status == ListingStatus.Active, 'Listing is not active');
		require(msg.value >= listing.price, 'Insufficient payment');

		listing.status = ListingStatus.Sold;

		IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);
		payable(listing.owner).transfer(listing.price);

		_numberOfSoldItems++;

		emit Sale(listingId, msg.sender, listing.token, listing.tokenId, listing.price);
	}

	function cancel(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender == listing.owner, 'Only owner can cancel listing');
		require(listing.status == ListingStatus.Active, 'Listing is not active');

		listing.status = ListingStatus.Cancelled;

		IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);

		emit Cancel(listingId, listing.owner);
	}

	function getListingPrice() public view returns (uint256) {
		return _listingPrice;
	}

	function getListing(uint256 listingId) public view returns (Listing memory) {
		return _listings[listingId];
	}

	function getListings() public view returns (Listing[] memory) {
		Listing[] memory ret = new Listing[](_numberOfListings);
		for (uint256 i = 0; i < _numberOfListings; i++) {
			ret[i] = _listings[i];
		}
		return ret;
	}
}
