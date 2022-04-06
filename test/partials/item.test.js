const { ethers } = require('hardhat');
const { expect } = require('chai');
// const { create, urlSource } = require('ipfs-http-client');

const test = l => {
	const length = l ?? 2;
	return () => {
		const testItemPrice = ethers.utils.parseEther('100');

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

					const amount = Math.ceil(Math.random() * 100) + 20;

					await item.mint(id.toString(), amount);
					expect(await item.tokenURI(id)).to.equal(id.toString());

					await market.listERC1155(item.address, id, testItemPrice, amount);

					const listing = await market.getERC1155Listing(id);

					expect(listing.sellers).to.include(main.address);

					const index = listing.sellers.indexOf(main.address);
					expect(ethers.utils.formatUnits(listing.amounts[index], 0)).to.equal(amount.toString());
				})
			);

			const listings = await market.listingsERC1155(item.address);
			expect(listings.length).to.equal(length);
		});
	};
};

module.exports = test;
