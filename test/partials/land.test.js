const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const test = () => {
	const length = 7;
	const testItemPrice = ethers.utils.parseUnits('100', 'ether');

	it('mint and list land', async () => {
		await Promise.all(
			Array.from({ length }, (v, k) => k).map(async x => {
				await Promise.all(
					Array.from({ length }, (v, k) => k).map(async y => {
						await land.connect(admin).mint(x, y);

						const coordinates = await land._coordinates(x, y);

						expect(coordinates.minted).to.equal(true);
						expect(parseInt(ethers.utils.formatUnits(coordinates.id, 0))).to.equal(x * length + y);

						await market.connect(admin).listLand(coordinates.id, ethers.utils.parseEther((Math.ceil(Math.random() * 100) + 100).toString()));

						expectRevert(land.mint(x, y), 'land already minted');
					})
				);
			})
		);

		expect((await land._coordinates(length + 1, length + 1)).minted).to.equal(false);
		expect(ethers.utils.formatUnits((await land._coordinates(length + 1, length + 1)).id, 0)).to.equal('0');
	});

	it('buy land', async () => {
		const initialMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));

		const listing = await market.getLandListing(0);
		const listings = await market.landListings();

		await token.connect(buyer).approve(market.address, listing.price);
		await market.connect(buyer).buyLand(listing.id);
		const updatedListing = await market.getLandListing(listing.id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(listing.id)).to.equal(buyer.address);

		const updatedMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));
		expect(updatedMarketBalance - initialMarketBalance - parseFloat(ethers.utils.formatEther(listing.price)) * (parseFloat(ethers.utils.formatUnits(await market._listingFeePermille(), 0)) / 1000)).to.be.below(0.00005);

		const newListings = await market.landListings();
		expect(newListings.length).to.equal(listings.length - 1);
	});

	it('list land again after buying', async () => {
		const listings = await market.landListings();

		const approved = await land.isApprovedForAll(buyer.address, market.address);
		if (!approved) {
			await land.connect(buyer).setApprovalForAll(market.address, true);
		}

		await market.connect(buyer).listLand(0, testItemPrice);
		const listing = await market.getLandListing(0);
		expect(listing.seller).to.equal(buyer.address);

		const newListings = await market.landListings();
		expect(newListings.length).to.equal(listings.length + 1);
	});

	it('cancel land listing', async () => {
		const id = parseInt(ethers.utils.formatUnits(await land._tokenId(), 0));

		await land.connect(admin).mint(255, 255);
		await land.connect(admin)['safeTransferFrom(address,address,uint256)'](admin.address, third.address, id);

		const approved = await land.isApprovedForAll(third.address, market.address);
		if (!approved) {
			await land.connect(third).setApprovalForAll(market.address, true);
		}

		await market.connect(third).listLand(id, testItemPrice);

		const listing = await market.getLandListing(id);
		expect(listing.seller).to.equal(third.address);

		await market.connect(third).cancelLand(id);
		const updatedListing = await market.getLandListing(id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(id)).to.equal(third.address);
	});

	it('cannot list land owned by someone else', async () => {
		await expectRevert(market.listLand(4, testItemPrice), 'listing can be done only by owner');
	});

	it('cannot cancel a land owned by someone else', async () => {
		await expectRevert(market.connect(third).cancelLand(1), 'only seller can cancel listing');
	});

	it('cannot buy an owned land', async () => {
		await expectRevert(market.connect(admin).buyLand(1), 'seller cannot be buyer');
	});
};

module.exports = test;
