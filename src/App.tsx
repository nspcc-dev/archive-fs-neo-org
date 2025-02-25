import React, { useState } from 'react';
import { Link, Route, Routes } from "react-router-dom";
import { library } from '@fortawesome/fontawesome-svg-core';
import {
	Navbar,
	Heading,
	Footer,
	Progress,
	Button,
} from 'react-bulma-components';
import Home from './Home.tsx';
import About from './About.tsx';
import NotFound from './NotFound.tsx';
import 'bulma/css/bulma.min.css';
import './App.css';

import {
	faSpinner,
	faDownload,
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faDownload,
  faSpinner,
);

interface NetItem {
	title: string
	containerId: string
	rpc: string
	maxBlock: number
}

interface Modal {
	current: string | null
	params: any
	btn: string | null | Function
}

export const App = () => {
	const [nets, setNets] = useState<NetItem[]>([{
		title: 'Mainnet',
		containerId: '3RCdP3ZubyKyo8qFeo7EJPryidTZaGCMdUjqFJaaEKBV',
		rpc: 'https://rpc10.n3.nspcc.ru',
		maxBlock: 0,
	}, {
		title: 'Testnet',
		containerId: 'A8nGtDemWrm2SjfcGAG6wvrxmXwqc5fwr8ezNDm6FraT',
		rpc: 'https://rpc.t5.n3.nspcc.ru',
		maxBlock: 0,
	}, {
		title: 'NeoFS Mainnet',
		containerId: 'BP71MqY7nJhpuHfdQU3infRSjMgVmSFFt9GfG2GGMZJj',
		rpc: 'https://rpc.morph.fs.neo.org',
		maxBlock: 0,
	}, {
		title: 'NeoFS Testnet',
		containerId: '98xz5YeanzxRCpH6EfUhECVm2MynGYchDN4naJViHT9M',
		rpc: 'https://rpc.t5.fs.neo.org',
		maxBlock: 0,
	}]);
	const [currentDownloadedBlock, setCurrentDownloadedBlock] = useState(0);
	const [menuActive, setMenuActive] = useState<boolean>(false);
	const [isLoading, setLoading] = useState<boolean>(false);
	const [modal, setModal] = useState<Modal>({
		current: null,
		params: '',
		btn: null,
	});

	const onModal = (current: string | null = null, params: any = null, btn: string | null = null) => {
		setModal({ current, params, btn });
	};

	const roundNumber = (num: number): number => {
		const rounded = num.toFixed(2);
		return parseFloat(rounded) % 1 === 0 ? parseInt(rounded) : parseFloat(rounded);
	};

  return (
    <>
			{(modal.current === 'success' || modal.current === 'failed') && (
				<div className="modal">
					<div
						className="modal_close_panel"
						onClick={() => onModal()}
					/>
					<div className="modal_content">
						<div
							className="modal_close"
							onClick={() => onModal()}
						>
							<img
								src="/img/close.svg"
								height={30}
								width={30}
								alt="close"
							/>
						</div>
						<Heading weight="semibold" subtitle style={{ textAlign: 'center' }}>{modal.current === 'success' ? 'Success' : 'Failed'}</Heading>
						<p style={{ textAlign: 'center', wordBreak: 'break-all' }}>{modal.params}</p>
						{typeof modal.btn === 'function' && (
							<Button
								color="primary"
								onClick={() => typeof modal.btn === 'function' && modal.btn(currentDownloadedBlock)}
								style={{ minWidth: 300, margin: '10px auto 0', display: 'flex'}}
							>
								<span>Retry</span>
							</Button>
						)}
						{modal.btn === 'about' && (
							<Button
								color="primary"
								renderAs="a"
								href="/about"
								style={{ minWidth: 300, margin: '10px auto 0', display: 'flex'}}
							>
								<span>Learn more</span>
							</Button>
						)}
					</div>
				</div>
			)}
			{modal.current === 'loading' && (
				<div className="modal">
					<div
						className="modal_close_panel"
						onClick={currentDownloadedBlock < (modal.params.spanEnd - modal.params.spanStart + 1) ? () => {} : () => {
							onModal();
							setCurrentDownloadedBlock(0);
						}}
					/>
					<div className="modal_content">
						<Heading weight="semibold" subtitle style={{ textAlign: 'center', marginBottom: 5 }}>{`Snapshot`}</Heading>
						<Heading weight="semibold" size={6} subtitle style={{ textAlign: 'center' }}>{`${modal.params.spanStart} - ${modal.params.spanEnd} (${nets[modal.params.network].title})`}</Heading>
						<Heading size={6} subtitle style={{ textAlign: 'center', margin: 0 }}>{currentDownloadedBlock / (modal.params.spanEnd - modal.params.spanStart + 1) === 1 ? 'Success!' : 'Downloading'}</Heading>
						<Progress
							max={100}
							value={roundNumber((currentDownloadedBlock / (modal.params.spanEnd - modal.params.spanStart + 1)) * 100)}
						/>
						<Heading size={6} subtitle style={{ textAlign: 'center', margin: 0 }}>{`${currentDownloadedBlock} / ${modal.params.spanEnd - modal.params.spanStart + 1} (${roundNumber((currentDownloadedBlock / (modal.params.spanEnd - modal.params.spanStart + 1)) * 100)}%)`}</Heading>
					</div>
				</div>
			)}
			<Navbar>
				<Navbar.Brand>
					<Navbar.Item
						renderAs="div"
						style={{ cursor: 'default' }}
					>
						<img src="/img/logo.svg" height="28" width="112" alt="logo"/>
					</Navbar.Item>
					<Navbar.Burger
						className={menuActive ? 'is-active' : ''}
						onClick={() => setMenuActive(!menuActive)}
					/>
				</Navbar.Brand>
				<Navbar.Menu
					className={menuActive ? 'is-active' : ''}
				>
					<Navbar.Container>
						<Link
							to="/"
							className="navbar-item"
							onClick={() => setMenuActive(false)}
						>
							Download
						</Link>
						<Link
							to="/about"
							className="navbar-item"
							onClick={() => setMenuActive(false)}
						>
							About
						</Link>
					</Navbar.Container>
				</Navbar.Menu>
			</Navbar>
			<main style={{ minHeight: 'calc(100vh - 218px)' }}>
				<Routes>
					<Route
						path="/"
						element={<Home
							onModal={onModal}
							nets={nets}
							setNets={setNets}
							setCurrentDownloadedBlock={setCurrentDownloadedBlock}
							isLoading={isLoading}
							setLoading={setLoading}
						/>}
					/>
					<Route
						path="/about"
						element={<About />}
					/>
					<Route
						path="*"
						element={<NotFound />}
					/>
				</Routes>
			</main>
			<Footer style={{ padding: '40px 20px' }}>
				<div className="socials">
					<a href="https://neo.org/" target="_blank" rel="noopener noreferrer">
						<img
							src="/img/socials/neo.svg"
							width={26}
							height={26}
							style={{ filter: 'invert(1)' }}
							alt="neo logo"
						/>
					</a>
					<span className="social_pipe">
						<a href="https://nspcc.io" target="_blank" rel="noopener noreferrer">
							<img
								src="/img/socials/neo_spcc.svg"
								width={37}
								height={37}
								alt="neo spcc logo"
							/>
						</a>
					</span>
					<a href="https://github.com/nspcc-dev" target="_blank" rel="noopener noreferrer" style={{ paddingLeft: 10 }}>
						<img
							src="/img/socials/github.svg"
							width={30}
							height={30}
							alt="github logo"
						/>
					</a>
					<a href="https://twitter.com/neospcc" target="_blank" rel="noopener noreferrer">
						<img
							src="/img/socials/twitter.svg"
							width={30}
							height={30}
							alt="twitter logo"
						/>
					</a>
					<a href="https://www.youtube.com/@NeoSPCC" target="_blank" rel="noopener noreferrer">
						<img
							src="/img/socials/youtube.svg"
							width={30}
							height={30}
							alt="youtube logo"
						/>
					</a>
					<a href="https://neospcc.medium.com/" target="_blank" rel="noopener noreferrer">
						<img
							src="/img/socials/medium.svg"
							width={30}
							height={30}
							alt="medium logo"
						/>
					</a>
				</div>
				<a href="https://fs.neo.org/hosting/">
					<Heading
						weight="light"
						subtitle
						style={{ textAlign: 'center', fontSize: '.75rem', marginBottom: 0 }}
					>
						<span style={{ textDecoration: 'underline' }}>Hosted on NeoFS</span>
					</Heading>
				</a>
				<Heading
					weight="light"
					subtitle
					style={{ textAlign: 'center', fontSize: '.75rem' }}
				>
					{process.env.REACT_APP_VERSION}
				</Heading>
			</Footer>
    </>
  );
}
