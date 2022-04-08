const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const test = () => {
	const length = random(5, 10);
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

						await landmarket.connect(admin).list(coordinates.id, ethers.utils.parseEther((Math.ceil(Math.random() * 100) + 100).toString()));

						expectRevert(land.mint(x, y), 'land already minted');
					})
				);
			})
		);

		expect((await land._coordinates(length + 1, length + 1)).minted).to.equal(false);
		expect(ethers.utils.formatUnits((await land._coordinates(length + 1, length + 1)).id, 0)).to.equal('0');
	});

	it('buy land', async () => {
		const initialMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(landmarket.address)));

		const listing = await landmarket.listing(0);
		const listings = await landmarket.listings();

		await token.connect(buyer).approve(landmarket.address, listing.price);
		await landmarket.connect(buyer).buy(listing.id);
		const updatedListing = await landmarket.listing(listing.id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(listing.id)).to.equal(buyer.address);

		const updatedMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(landmarket.address)));
		expect(updatedMarketBalance - initialMarketBalance - parseFloat(ethers.utils.formatEther(listing.price)) * (parseFloat(ethers.utils.formatUnits(await landmarket._lisFee(), 0)) / 1000)).to.be.below(0.00005);

		const newListings = await landmarket.listings();
		expect(newListings.length).to.equal(listings.length - 1);
	});

	it('list land again after buying', async () => {
		const listings = await landmarket.listings();

		const approved = await land.isApprovedForAll(buyer.address, landmarket.address);
		if (!approved) {
			await land.connect(buyer).setApprovalForAll(landmarket.address, true);
		}

		await landmarket.connect(buyer).list(0, testItemPrice);
		const listing = await landmarket.listing(0);
		expect(listing.seller).to.equal(buyer.address);

		const newListings = await landmarket.listings();
		expect(newListings.length).to.equal(listings.length + 1);
	});

	it('cancel land listing', async () => {
		const id = parseInt(ethers.utils.formatUnits(await land._tokenId(), 0));

		await land.connect(admin).mint(255, 255);
		await land.connect(admin)['safeTransferFrom(address,address,uint256)'](admin.address, third.address, id);

		const approved = await land.isApprovedForAll(third.address, landmarket.address);
		if (!approved) {
			await land.connect(third).setApprovalForAll(landmarket.address, true);
		}

		await landmarket.connect(third).list(id, testItemPrice);

		const listing = await landmarket.listing(id);
		expect(listing.seller).to.equal(third.address);

		await landmarket.connect(third).unlist(id);
		const updatedListing = await landmarket.listing(id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(id)).to.equal(third.address);
	});

	it('cannot list land owned by someone else', async () => {
		await expectRevert(landmarket.list(4, testItemPrice), 'listing can be done only by owner');
	});

	it('cannot cancel a land owned by someone else', async () => {
		await expectRevert(landmarket.connect(third).unlist(1), 'only seller can cancel listing');
	});

	it('cannot buy an owned land', async () => {
		await expectRevert(landmarket.connect(admin).buy(1), 'seller cannot be buyer');
	});
};

module.exports = test;
