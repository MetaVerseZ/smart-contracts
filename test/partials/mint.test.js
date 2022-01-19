const { ethers } = require('hardhat');
const { expect } = require('chai');
// const { create, urlSource } = require('ipfs-http-client');

const test = l => {
	const length = l ?? 2;
	return () => {
		before(async () => (listingFee = (await market._listingFee()).toString()));
		const testItemPrice = ethers.utils.parseUnits('5000', 'ether');

		// const ipfs = create({ silent: true });
		// const gateway = 'http://ipfs.io/ipfs';

		it('mint and list items', async () => {
			await Promise.all(
				Array.from({ length }, (v, k) => k).map(async id => {
					// const metadata = {
					// 	id,
					// 	name: `item ${id}`,
					// 	description: 'some description',
					// 	image: (await ipfs.add(urlSource('https://picsum.photos/64'))).cid.toString(),
					// };

					// const { cid } = await ipfs.add(JSON.stringify(metadata));
					// const uri = `${gateway}/${cid}`;

					await item.mint(id);

					await token.approve(market.address, listingFee);
					await market.listItem(id, testItemPrice);

					const listing = await market.getListing(id);
					expect(listing.status).to.equal(0);
					expect(await item.tokenURI(id)).to.equal(`ipfs://${id}`);
				})
			);

			const listings = await market.getAllListings();
			expect(listings.length).to.equal(length);
		});
	};
};

module.exports = test;
