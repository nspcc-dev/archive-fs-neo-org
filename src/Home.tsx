import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	Content,
	Container,
	Form,
	Section,
	Heading,
	Tile,
	Tag,
	Notification,
	Button,
} from 'react-bulma-components';
import api from './api.ts';

const base58 = require('base-58');

interface NetItem {
	title: string
	containerId: string
}

interface FormData {
	spanStart: number | ''
	spanEnd: number | ''
	network: number
}

const Home = ({
	onModal,
	nets,
	setNets,
	setCurrentDownloadedBlock,
	isLoading,
	setLoading,
}) => {
	const [formData, setFormData] = useState<FormData>({
		spanStart: 0,
		spanEnd: '',
		network: 0,
	});

	let fileHandle: FileSystemFileHandle | null = null;

  useEffect(() => {
		if (nets[formData.network].maxBlock === 0) {
			api('POST', nets[formData.network].rpc, {
				"jsonrpc": "2.0",
				"id": 1,
				"method": "getblockcount",
				"params": []
			}).then((res: any) => {
				const netsTemp = [...nets];
				netsTemp[formData.network].maxBlock = Math.floor(res.result / 128000) * 128000;
				setNets(netsTemp);

				setFormData({ ...formData, spanEnd: nets[formData.network].maxBlock });
			}).catch(() => {
				onModal('failed', 'Failed to fetch the last available block');
			});
		} else {
			if (formData.spanEnd > nets[formData.network].maxBlock) return setFormData({ ...formData, spanEnd: nets[formData.network].maxBlock });
		}
  },[formData.network]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlocksInRange = async (retryIndex: number | null = null) => {
		if (formData.spanStart === '' || formData.spanEnd === '' || formData.spanEnd < 0) return onModal('failed', 'Insert correct data');
		if (formData.spanStart < 0 || formData.spanEnd < 0 || formData.spanStart > nets[formData.network].maxBlock || formData.spanEnd > nets[formData.network].maxBlock) return onModal('failed', 'Insert correct borders');


		if (retryIndex === null) {
			setLoading(true);
		}
		const currentNet: NetItem = nets[formData.network];

		try {
			if (retryIndex === null) {
				fileHandle = await window.showSaveFilePicker({
					suggestedName: `chain.${formData.spanStart}.acc`,
					types: [{ accept: { 'application/octet-stream': ['.acc'] } }],
				});
			}
			onModal('loading', formData);

			const writableStream = await fileHandle?.createWritable(retryIndex === null ? {} : { keepExistingData: true });

			const blockCount = formData.spanEnd - formData.spanStart + 1;
			if (retryIndex === null) {
				await writableStream?.write(new Int32Array([blockCount]).buffer);
			} else {
				const offset: any = (await fileHandle?.getFile())?.size;
				writableStream?.seek(offset)
			}

			const indexFileStart = Math.floor(formData.spanStart / 128000);
			const indexFileCount = Math.ceil((formData.spanEnd - formData.spanStart) / 128000) + indexFileStart;
			for (let indexFile = indexFileStart; indexFile <= indexFileCount; indexFile += 1) {

				const indexData: Uint8Array | string = await fetchIndexFile(currentNet, indexFile);
				if (typeof indexData === 'string') {
					await writableStream?.close();
					onModal('failed', indexData, (retryIndexTemp: number) => fetchBlocksInRange(+formData.spanStart + retryIndexTemp));
					return
				}

				const uint8Data = new Uint8Array(indexData);
				const objectsData: string[] = [];
				for (let i = 0; i < uint8Data.length; i += 32) {
					const chunk = uint8Data.slice(i, i + 32);
					const encoded = base58.encode(chunk);
					objectsData.push(encoded);
				}

				const startBlock = retryIndex !== null ? retryIndex : formData.spanStart;
				for (let i = startBlock - (128000 * indexFile); i <= objectsData.length; i += 1) {
					if (blockCount <= (indexFile * 128000 + i - formData.spanStart)) {
						await writableStream?.close();
						return
					}

					const objectData: Uint8Array | string = await fetchBlock(currentNet, objectsData[i]);
					if (typeof objectData === 'string') {
						await writableStream?.close();
						onModal('failed', objectData, (currentDownloadedBlockTemp: number) => fetchBlocksInRange(+formData.spanStart + currentDownloadedBlockTemp));
						return
					}

					const blockSize = new Uint32Array([objectData.byteLength]);
					await writableStream?.write(blockSize.buffer);
					await writableStream?.write(new Uint8Array(objectData));
					setCurrentDownloadedBlock((indexFile * 128000 + i) - formData.spanStart + 1);
				}
			}
		} catch (error: any) {
			if (error.message.indexOf('showSaveFilePicker is not a function') !== -1) {
				onModal('failed', 'Your current browser does not support this site\'s functionality. For the best experience, please use Chrome 86+ (recommended).', 'about');
			} else if (error.message.indexOf('The user aborted a request.') !== -1) {
				onModal('failed', 'Aborted by user.');
			} else {
				onModal('failed', error.message || 'Error occurred during block fetching.', (retryIndexTemp: number) => fetchBlocksInRange(+formData.spanStart + retryIndexTemp));
			}
		} finally {
			setLoading(false);
		}
  };

	const fetchIndexFile = async (currentNet: NetItem, indexNumber: number): Promise<Uint8Array | string> => {
		try {
			const searchResponse: any = await api('POST', `/objects/${currentNet.containerId}/search?walletConnect=false&offset=0&limit=1`, {
				filters: [{
					"key": "Index",
					"match": "MatchStringEqual",
					"value": indexNumber.toString(),
				}],
			});

			const objectId = searchResponse.objects[0]?.address.objectId;
			if (!objectId) {
				return `Error occurred during index fetching #${indexNumber}`;
			}

			const indexResponse = await api('GET', `/objects/${currentNet.containerId}/by_id/${objectId}?walletConnect=false`);
			return indexResponse as Uint8Array;
		} catch (err: any) {
			return `Error occurred during index fetching #${indexNumber}: ${err.message}`;
		}
	};

	const fetchBlock = async (currentNet: NetItem, objectId: string): Promise<Uint8Array | string> => {
		try {
			const blockResponse = await api('GET', `/objects/${currentNet.containerId}/by_id/${objectId}?walletConnect=false`);
			return blockResponse as Uint8Array;
		} catch (err: any) {
			return `Error occurred during object fetching ${objectId}: ${err.message}`;
		}
	};

  return (
		<Container>
			<Section>
				<Tile kind="ancestor">
					<Tile kind="parent">
						<Tile
							kind="child"
							renderAs={Notification}
							color={"gray"}
						>
							<Heading weight="semibold" subtitle style={{ textAlign: 'center' }}>Archive.NeoFS – Offline Synchronization Package</Heading>
							<Content>
								<p>Easily download an offline package of blocks up to a specific block height.</p>
								<p>Manual steps:</p>
								<ul>
									<li>Choose <code>start</code> and <code>end</code> snapshot option for the data range;</li>
									<li>Select the desired <code>network</code>;</li>
									<li>Click the Download button;</li>
									<li>Wait for <code>.acc</code> file to download to your device. 🚀</li>
								</ul>
								<p>For the best experience, please use Chrome 86+.</p>
							</Content>
						</Tile>
					</Tile>
				</Tile>
				<Tile kind="ancestor">
					<Tile kind="parent">
						<Tile
							kind="child"
							renderAs={Notification}
							color={"gray"}
						>
							<Heading weight="semibold" subtitle style={{ textAlign: 'center' }}>Prepare snapshot</Heading>
							<Form.Field className="inputs_block">
								<Form.Control>
									<Form.Input
										placeholder="Start position"
										type="text"
										value={formData.spanStart}
										onChange={(e: any) => {
											if (e.target.value === '' || /^[0-9]*[.]?[0-9]*$/.test(e.target.value)) {
												setFormData({ ...formData, spanStart: e.target.value !== '' && e.target.value >= 0 ? Number(e.target.value) : '' });
											}
										}}
										disabled={isLoading}
									/>
								</Form.Control>
								<Form.Control>
									<Form.Input
										placeholder="End position"
										type="text"
										value={formData.spanEnd}
										onChange={(e: any) => {
											if (e.target.value === '' || /^[0-9]*[.]?[0-9]*$/.test(e.target.value)) {
												setFormData({ ...formData, spanEnd: e.target.value !== '' && e.target.value >= 0 ? Number(e.target.value) : '' });
											}
										}}
										disabled={isLoading}
									/>
								</Form.Control>
							</Form.Field>
							<Form.Field className="select_block">
								<Form.Control>
									<Form.Select
										onChange={(e: any) => setFormData({ ...formData, network: Number(e.target.value) })}
										value={formData.network}
										disabled={isLoading}
									>
										<option value="0">Mainnet</option>
										<option value="1">Testnet</option>
										<option value="2">NeoFS Mainnet</option>
										<option value="3">NeoFS Testnet</option>
									</Form.Select>
								</Form.Control>
							</Form.Field>
							<Form.Field style={{ display: 'flex', justifyContent: 'center', marginBottom: '.25rem' }}>
								<Tag>{`the latest available block is ${nets[formData.network].maxBlock ? nets[formData.network].maxBlock : '-'}`}</Tag>
							</Form.Field>
							<Button.Group style={{ justifyContent: 'center' }}>
								<Button
									color="primary"
									onClick={() => fetchBlocksInRange()}
									style={{ minWidth: 300 }}
									disabled={isLoading}
								>
									<span>Download .acc file</span>
									<FontAwesomeIcon
										icon={['fas', 'download']}
										style={{ marginLeft: 6 }}
									/>
								</Button>
							</Button.Group>
						</Tile>
					</Tile>
				</Tile>
			</Section>
		</Container>
  );
}

export default Home;
