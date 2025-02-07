import React from 'react';
import {
	Content,
	Container,
	Section,
	Heading,
	Tile,
	Notification,
} from 'react-bulma-components';

const About = () => {
  return (
		<Container>
			<Section>
				<Tile kind="ancestor" id="about">
					<Tile kind="parent">
						<Tile
							kind="child"
							renderAs={Notification}
							color={"gray"}
						>
							<Heading weight="semibold" subtitle style={{ textAlign: 'center' }}>About Service</Heading>
							<Content>
								<p>Archive.NeoFS is a web application that allows users to create blockchain archives of any span (from block 0 to the current block or a custom range) directly in the browser. It operates fully client-side, leveraging standard NeoFS REST gateway APIs and in-browser streaming techniques to efficiently fetch and store blocks without requiring additional backend processing.</p>
								<p>The service supports four networks: mainnet, testnet, NeoFS mainnet, and NeoFS testnet. It interacts with the <a href="https://github.com/nspcc-dev/neofs-rest-gw/" target="_blank" rel="noopener noreferrer">NeoFS REST gateway</a> to retrieve blockchain data stored in NeoFS objects and assembles them into a structured archive format (.acc), that is compatible with both C# Neo node and NeoGo.</p>
								<p><a href="https://github.com/nspcc-dev/send-fs-neo-org" target="_blank" rel="noopener noreferrer">Frontend part</a> first determines the latest available block in the selected network using the <code>getblockcount</code> method in the RPC request. Each block is stored as a separate object with a unique Object ID (OID), while index files contain references to batches of 128,000 blocks, mapping block indices to their corresponding OIDs. It then, using <a href="https://github.com/nspcc-dev/neofs-rest-gw/" target="_blank" rel="noopener noreferrer">NeoFS REST gateway</a>, the program first retrieves index files using SEARCH, then extracts object IDs then fetches these objects (containing blocks) via GET NeoFS request.</p>
								<p>The process runs entirely in the browser using the <code>showSaveFilePicker</code> API for file handling and the <code>WritableStream</code> API for efficient in-browser streaming. Downloaded blocks are written directly into an archive <code>.acc</code> file, ensuring minimal memory overhead. However, due to API limitations, this feature is only supported in modern browsers: Chrome 86+ (recommended).</p>
							</Content>
						</Tile>
					</Tile>
				</Tile>
			</Section>
		</Container>
  );
}

export default About;
