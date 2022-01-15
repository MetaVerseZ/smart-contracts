const { ethers } = require('hardhat');
const { expect } = require('chai');
// const { create, urlSource } = require('ipfs-http-client');

const test = () => {
	before(async () => (listingFee = (await market._listingFee()).toString()));

	const testNftPrice = ethers.utils.parseUnits('5000', 'ether');

	// const ipfs = create({ silent: true });
	// const gateway = 'http://ipfs.io/ipfs';

	it('mint and list items', async () => {
		const IDS = [0, 1];
		await Promise.all(
			IDS.map(async id => {
				// const metadata = {
				// 	id,
				// 	name: `item ${id}`,
				// 	description: 'some description',
				// 	image: (await ipfs.add(urlSource('https://picsum.photos/64'))).cid.toString(),
				// };

				// const { cid } = await ipfs.add(JSON.stringify(metadata));
				// const uri = `${gateway}/${cid}`;
				const uri = `https://www.example.com/${id}`;

				await nft.mint(uri);
				await token.approve(market.address, listingFee);
				await market.listToken(nft.address, id, testNftPrice);

				const listing = await market.getListing(id);
				expect(listing.token).to.equal(nft.address);
				expect(listing.status).to.equal(0);

				expect(await nft.tokenURI(id)).to.equal(uri);
			})
		);
		const listings = await market.getAllListings();
		expect(listings.length).to.equal(IDS.length);
	});

	it('buy item', async () => {
		const listing = await market.getListing(0);
		await token.connect(buyer).approve(market.address, listing.price);
		await market.connect(buyer).buyToken(listing.id);
		const updatedListing = await market.getListing(listing.id);
		expect(updatedListing.owner).to.equal(buyer.address);
		expect(updatedListing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listToken(nft.address, 0, testNftPrice);
		const listing = await market.getListing(0);
		expect(listing.status).to.equal(0);
		const listings = await market.getAllListings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const initialBalance = await token.balanceOf(main.address);

		const ID = 2;
		await nft.mint('http://example.com/3');
		await market.listToken(nft.address, ID, testNftPrice);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance) + ethers.utils.formatEther(listingFee)));

		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.status).to.equal(1);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance)));
	});

	it('check owned items', async () => {
		const mainOwnedItems = (await nft.getAccountItems(main.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		const buyerOwnedItems = (await nft.getAccountItems(buyer.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		expect(mainOwnedItems.length).to.equal(2);
		expect(buyerOwnedItems.length).to.equal(1);
		expect(mainOwnedItems.every(item => [1, 2].includes(item)) && [1, 2].every(item => mainOwnedItems.includes(item))).to.equal(true);
		expect(buyerOwnedItems.every(item => [0].includes(item)) && [0].every(item => buyerOwnedItems.includes(item))).to.equal(true);
	});

	it('cannot list a token owned by someone else', async () => {
		try {
			await market.listToken(nft.address, 1, testNftPrice);
		} catch (error) {
			expect(error.message.includes('listing can be done only by owner')).to.equal(true);
		}
	});

	it('cannot cancel a token owned by someone else', async () => {
		try {
			await market.connect(buyer).cancel(1);
		} catch (error) {
			expect(error.message.includes('only owner can cancel listing')).to.equal(true);
		}
	});

	it('cannot buy an owned item', async () => {
		try {
			await market.buyToken(1);
		} catch (error) {
			expect(error.message.includes('owner cannot be buyer')).to.equal(true);
		}
	});

	it('cannot buy an inactive item', async () => {
		try {
			await market.connect(buyer).buyToken(2);
		} catch (error) {
			expect(error.message.includes('listing is not active')).to.equal(true);
		}
	});

	it('catch insufficient listing fee', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await nft.connect(account).mint(`http://example.com/4`);
			await market.connect(account).listToken(nft.address, 3, testNftPrice);
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low for listing fee')).to.equal(true);
		}
	});

	it('catch low balance for buy payment', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low')).to.equal(true);
		}
	});
};

module.exports = test;
