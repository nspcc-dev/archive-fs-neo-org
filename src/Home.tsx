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
import base58 from 'base-58';

interface NetItem {
	title: string
	containerId: string
}

interface FormData {
	spanStart: number | ''
	spanEnd: number | ''
	network: number
}

interface QueuedBlock {
	blockNumber: number;
	oid: string
}

interface BlockWithAttrs {
	objectId: string;
	attributes: Record<string, any>;
}

const Home = ({
	onModal,
	nets,
	setNets,
	setCurrentDownloadedBlock,
	setAbortController,
	isLoading,
	setLoading,
}) => {
	const [formData, setFormData] = useState<FormData>({
		spanStart: 0,
		spanEnd: nets[0].maxBlock !== 0 ? nets[0].maxBlock : '',
		network: 0,
	});

	let fileHandle: FileSystemFileHandle | null = null;

  useEffect(() => {
		const currentMaxBlock = nets[formData.network].maxBlock;
		if (currentMaxBlock === 0) {
			api('POST', nets[formData.network].rpc, {
				"jsonrpc": "2.0",
				"id": 1,
				"method": "getblockcount",
				"params": []
			}).then((res: any) => {
				const netsTemp = [...nets];
				netsTemp[formData.network].maxBlock = Math.floor(res.result / 128000) * 128000;
				setNets(netsTemp);

				setFormData((prevFormData) => {
					if (prevFormData.spanEnd === '' || nets.map((item) => item.maxBlock).indexOf(prevFormData.spanEnd) !== -1) {
						return ({ ...formData, spanEnd: nets[formData.network].maxBlock });
					} else {
						return prevFormData;
					}
				});
			}).catch(() => {
				onModal('failed', 'Failed to fetch the last available block');
			});
		} else {
			if (formData.spanEnd === '' || nets.map((item) => item.maxBlock).indexOf(formData.spanEnd) !== -1) return setFormData({ ...formData, spanEnd: currentMaxBlock });
		}
  },[formData.network]); // eslint-disable-line react-hooks/exhaustive-deps

	const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const fetchBlocksInRange = async (retryIndex: number | null = null) => {
		if (formData.spanStart === '' || formData.spanEnd === '' || formData.spanEnd < 0) return onModal('failed', 'Insert correct data');
		if (formData.spanStart < 0 || formData.spanEnd < 0 || formData.spanStart > formData.spanEnd || ((formData.spanStart > nets[formData.network].maxBlock || formData.spanEnd > nets[formData.network].maxBlock) && nets[formData.network].maxBlock !== 0)) return onModal('failed', 'Insert correct borders');


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
			onModal('loading', formData, (retryIndexTemp: number) => fetchBlocksInRange(+formData.spanStart + retryIndexTemp));

			const controllerStop = new AbortController();
			const controllerPause = new AbortController();
   	 	setAbortController({
				controllerStop,
				controllerPause,
			});

			const writableStream = await fileHandle?.createWritable(retryIndex === null ? {} : { keepExistingData: true });

			const blockCount = formData.spanEnd - formData.spanStart + 1;
			if (retryIndex === null) {
				await writableStream?.write(new Int32Array([blockCount]).buffer);
			} else {
				const offset: number = (await fileHandle?.getFile())?.size ?? 0;
				await writableStream?.seek(offset);
			}

			const queue: QueuedBlock[] = [];
			const startBlock: any = retryIndex !== null ? retryIndex : formData.spanStart;
			let lastBlockIndex: number | null = null;
			let writtenCount: number = retryIndex !== null ? retryIndex : 0;
			let isRefilling = false;

			const refillQueue = async (nextBlock: number = startBlock) => {
				if (controllerStop.signal.aborted) return;
				if (isRefilling || nextBlock > +formData.spanEnd) return;
				isRefilling = true;

				const remaining = +formData.spanEnd - nextBlock + 1;
				const limit = Math.min(1000, remaining);
				try {
					const objectsData: BlockWithAttrs[] | string = await fetchBatchBlocks(currentNet, nextBlock, limit);
					if (typeof objectsData === 'string') {
						controllerStop.abort();
						await writableStream?.close();
						onModal('failed', objectsData, (retryIndexTemp: number) => fetchBlocksInRange(nextBlock + retryIndexTemp));
						return
					}

					objectsData.forEach((block) => queue.push({ blockNumber: Number(block.attributes.Block), oid: block.objectId }));
				} finally {
					isRefilling = false;
				}
			};

			await refillQueue();

			while (!controllerStop.signal.aborted && writtenCount < blockCount) {
				if (queue.length < 500) {
					refillQueue(queue[queue.length - 1].blockNumber + 1);
				}

				if (queue.length === 0) {
					await delay(50);
					continue;
				}

				const { blockNumber, oid } = queue.shift()!;

				if (controllerStop.signal.aborted) throw new Error('Fetching aborted');
				if (controllerPause.signal.aborted) throw new Error('Paused');

				if (blockNumber === lastBlockIndex) {
					continue;
				}
				lastBlockIndex = blockNumber;

				const objectData: Uint8Array | string = await fetchBlock(currentNet, blockNumber, oid);
				if (typeof objectData === 'string') {
					controllerStop.abort();
					await writableStream?.close();
					onModal('failed', objectData, (currentDownloadedBlockTemp: number) => fetchBlocksInRange(+formData.spanStart + currentDownloadedBlockTemp));
					return
				}

				const blockSize = new Uint32Array([objectData.byteLength]).buffer;
				await writableStream?.write(blockSize);
				await writableStream?.write(objectData);

				writtenCount += 1;
				setCurrentDownloadedBlock(writtenCount);
			}

			await writableStream?.close();

		} catch (error: any) {
			if (error.message.indexOf('Fetching aborted') !== -1) {
				onModal('failed', 'Fetching was cancelled');
				setAbortController(null);
			} else if (error.message.indexOf('showSaveFilePicker is not a function') !== -1) {
				onModal('failed', 'Your current browser does not support this site\'s functionality. For the best experience, please use Chrome 86+ (recommended).', 'about');
			} else if (error.message.indexOf('The user aborted a request.') !== -1) {
				onModal('failed', 'Aborted by user.');
			} else if (error.message.indexOf('Paused') === -1) {
				onModal('failed', error.message || 'Error occurred during block fetching.', (retryIndexTemp: number) => fetchBlocksInRange(+formData.spanStart + retryIndexTemp));
			}
		} finally {
			setLoading(false);
		}
  };

	const fetchBatchBlocks = async (currentNet: NetItem, batchStart: number, limit: number = 1000): Promise<BlockWithAttrs[] | string> => {
		try {
			const searchResponse: any = await api('POST', `/v2/objects/${currentNet.containerId}/search?limit=${limit}`, {
				attributes: [
					'Block',
				],
				filters: [{
					"key": "Block",
					"match": "MatchNumGE",
					"value": batchStart.toString(),
				}],
			});

			if (searchResponse.objects.length === 0) {
				return `Error occurred during fetching objects #${batchStart}`;
			}

			return searchResponse.objects as BlockWithAttrs[];
		} catch (err: any) {
			return `Error occurred during fetching objects #${batchStart}: ${err.message}`;
		}
	};

	const fetchBlock = async (currentNet: NetItem, objectNumber: number, objectId: string): Promise<Uint8Array | string> => {
		try {
			const blockResponse = await api('GET', `/v1/objects/${currentNet.containerId}/by_id/${objectId}`);
			return blockResponse as Uint8Array;
		} catch (err: any) {
			return `Error occurred during object fetching #${objectNumber}: ${err.message}`;
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
								<p>Easily download a NEP-32 chain dump of blocks up to a specific block height.</p>
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
										renderAs="input"
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
										renderAs="input"
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
										renderAs="select"
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
