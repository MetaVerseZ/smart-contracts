// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import 'hardhat/console.sol';

contract NFTMarket is ReentrancyGuard {
	using Counters for Counters.Counter;
	Counters.Counter private numberOfItems;
	Counters.Counter private numberOfSoldItems;

	address payable owner;
	uint256 listingPrice = 0.025 ether;

	constructor() {
		owner = payable(msg.sender);
	}

	struct NFT {
		uint256 id;
		address nftContract;
		uint256 tokenId;
		address payable creator;
		address payable owner;
		uint256 price;
		bool inMarket;
	}

	mapping(uint256 => NFT) private MarketItems;

	event MarketItemCreated(uint256 indexed id, address indexed nftContract, uint256 indexed tokenId, address owner, uint256 price, bool inMarket);

	function getListingPrice() public view returns (uint256) {
		return listingPrice;
	}

	function createMarketItem(
		address nftContract,
		uint256 tokenId,
		uint256 price
	) public payable nonReentrant {
		require(price > 0, 'NFT price must be at least 1 wei');
		require(msg.value == listingPrice, 'Price must be equal to listing price');

		uint256 id = numberOfItems.current();
		numberOfItems.increment();

		MarketItems[id] = NFT(id, nftContract, tokenId, payable(msg.sender), payable(msg.sender), price, true);

		IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

		emit MarketItemCreated(id, nftContract, tokenId, msg.sender, msg.sender, price, true);
	}

	function sellItem(address nftContract, uint256 id) public payable nonReentrant {
		uint256 price = MarketItems[id].price;
		uint256 tokenId = MarketItems[id].tokenId;
		require(msg.value == price, 'Please submit the asking price in order to complete the purchase');

		MarketItems[id].owner.transfer(msg.value);
		IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
		MarketItems[id].owner = payable(msg.sender);
		MarketItems[id].inMarket = false;
		numberOfSoldItems.increment();
		payable(owner).transfer(listingPrice);
	}

	function getMarketItems() public view returns (NFT[] memory) {
		uint256 itemCount = numberOfItems.current();
		uint256 unsoldItemCount = numberOfItems.current() - numberOfSoldItems.current();
		uint256 currentIndex = 0;

		NFT[] memory items = new NFT[](unsoldItemCount);
		for (uint256 i = 0; i < itemCount; i++) {
			if (MarketItems[i].inMarket) {
				NFT storage currentItem = MarketItems[i];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}
		return items;
	}

	function getOwnedItems() public view returns (NFT[] memory) {
		uint256 totalItemCount = numberOfItems.current();
		uint256 itemCount = 0;
		uint256 currentIndex = 0;

		for (uint256 i = 0; i < totalItemCount; i++) {
			if (MarketItems[i].owner == msg.sender) {
				itemCount += 1;
			}
		}

		NFT[] memory items = new NFT[](itemCount);
		for (uint256 i = 0; i < totalItemCount; i++) {
			if (MarketItems[i].owner == msg.sender) {
				NFT storage currentItem = MarketItems[i];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}
		return items;
	}

	function getCreatedItems() public view returns (NFT[] memory) {
		uint256 totalItemCount = numberOfItems.current();
		uint256 itemCount = 0;

		for (uint256 i = 0; i < totalItemCount; i++) {
			if (MarketItems[i].creator == msg.sender) {
				itemCount += 1;
			}
		}

		uint256 currentIndex = 0;
		NFT[] memory items = new NFT[](itemCount);
		for (uint256 i = 0; i < totalItemCount; i++) {
			if (MarketItems[i].creator == msg.sender) {
				NFT storage currentItem = MarketItems[i];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}
		return items;
	}
}
