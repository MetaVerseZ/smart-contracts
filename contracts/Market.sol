// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

contract Market {
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

	uint256 private _listingFee = 0.001 ether;
	uint256 private _numberOfListings;
	uint256 private _numberOfSoldItems;

	mapping(uint256 => Listing) private _listings;

	function listToken(
		address token,
		uint256 id,
		uint256 price
	) public payable {
		require(msg.value == _listingFee, 'Price must be equal to listing price');
		require(msg.sender == IERC721(token).ownerOf(id), 'Listing can be done only by owner');
		Listing memory listing = Listing(ListingStatus.Listed, msg.sender, token, id, price);
		_listings[id] = listing;
		emit Listed(id, msg.sender, token, id, price);

		if (id >= _numberOfListings) {
			_numberOfListings++;
		}
	}

	function buyToken(uint256 listingId) external payable {
		Listing storage listing = _listings[listingId];

		require(msg.sender != listing.owner, 'Owner cannot be buyer');
		require(listing.status == ListingStatus.Listed, 'Listing is not active');
		require(msg.value >= listing.price, 'Insufficient payment');

		IERC721(listing.token).transferFrom(listing.owner, msg.sender, listing.id);
		payable(listing.owner).transfer(msg.value);

		listing.status = ListingStatus.NotListed;
		listing.owner = msg.sender;

		_numberOfSoldItems++;

		emit Sale(listingId, msg.sender, listing.token, listing.id, listing.price);
	}

	function cancel(uint256 listingId) public {
		Listing storage listing = _listings[listingId];

		require(msg.sender == listing.owner, 'Only owner can cancel listing');
		require(listing.status == ListingStatus.Listed, 'Listing is not active');

		listing.status = ListingStatus.NotListed;

		emit Cancel(listingId, listing.owner);
	}

	function getListingFee() public view returns (uint256) {
		return _listingFee;
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
