(function () {
	'use strict';

	// Backend API URL — change this to match your deployment
	const API_URL = 'https://carrier.tailc28ad2.ts.net/api/v1/chat';
	const SESSION_KEY = 'straulix_chat_session_id';
	const HISTORY_KEY = 'straulix_chat_history';
	const MAX_MESSAGE_LENGTH = 500;
	const WELCOME_MESSAGE =
		"Hi there! I'm your Lime and Cedar shipping assistant. Tell me about the vehicle you need shipped and I'll get you an instant quote!";

	let isOpen = false;
	let hasOpenedBefore = false;
	let historyLoaded = false;
	let isWaiting = false;

	const root = document.getElementById('chat-widget-root');
	if (!root) {
		console.error('chat-widget: #chat-widget-root not found');
		return;
	}

	// --- Build DOM ---

	root.innerHTML = `
		<button class="chat-widget-toggle" aria-label="Open chat">
			<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
			</svg>
		</button>
		<div class="chat-widget-window">
			<div class="chat-widget-header">
				<span class="chat-widget-header-title">Straulix Assistant</span>
				<div class="chat-widget-header-actions">
					<button class="chat-widget-reset" aria-label="New chat" title="Start new chat">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="23 4 23 10 17 10"/>
							<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
						</svg>
					</button>
					<button class="chat-widget-close" aria-label="Close chat">&times;</button>
				</div>
			</div>
			<div class="chat-widget-messages"></div>
			<div class="chat-widget-input">
				<input class="chat-widget-input-field" type="text" placeholder="Type your message..." maxlength="${MAX_MESSAGE_LENGTH}">
				<button class="chat-widget-send" aria-label="Send message">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="22" y1="2" x2="11" y2="13"/>
						<polygon points="22 2 15 22 11 13 2 9 22 2"/>
					</svg>
				</button>
			</div>
		</div>
	`;

	const btnToggle = root.querySelector('.chat-widget-toggle');
	const chatWindow = root.querySelector('.chat-widget-window');
	const btnClose = root.querySelector('.chat-widget-close');
	const messagesContainer = root.querySelector('.chat-widget-messages');
	const inputField = root.querySelector('.chat-widget-input-field');
	const btnSend = root.querySelector('.chat-widget-send');

	// --- Session management ---

	function getSessionId() {
		return localStorage.getItem(SESSION_KEY) || null;
	}

	function setSessionId(id) {
		if (id) {
			localStorage.setItem(SESSION_KEY, id);
		}
	}

	function clearSession() {
		localStorage.removeItem(SESSION_KEY);
	}

	// --- Cookie-based chat history ---

	function getChatHistory() {
		try {
			var raw = localStorage.getItem(HISTORY_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			return [];
		}
	}

	function saveChatHistory(messages) {
		try {
			localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
		} catch (e) {
			// storage full — clear and continue
			localStorage.removeItem(HISTORY_KEY);
		}
	}

	function addToHistory(msg) {
		var history = getChatHistory();
		history.push(msg);
		saveChatHistory(history);
	}

	function clearChatHistory() {
		localStorage.removeItem(HISTORY_KEY);
	}

	function resetChat() {
		clearSession();
		clearChatHistory();
		historyLoaded = false;
		hasOpenedBefore = false;
		isWaiting = false;
		messagesContainer.innerHTML = '';
		setInputDisabled(false);
		appendBotMessage(WELCOME_MESSAGE);
		historyLoaded = true;
		hasOpenedBefore = true;
		inputField.focus();
	}

	// --- Toggle ---

	function loadHistory() {
		if (historyLoaded) {
			return;
		}
		historyLoaded = true;

		appendBotMessage(WELCOME_MESSAGE);

		var history = getChatHistory();
		if (history.length === 0) {
			return;
		}

		history.forEach(function (msg) {
			if (msg.role === 'user') {
				appendUserMessage(msg.text);
			} else if (msg.price !== null && msg.price !== undefined) {
				appendBotMessageWithPrice(msg.text, msg.price);
			} else {
				appendBotMessage(msg.text);
			}
		});
	}

	function openChat() {
		isOpen = true;
		chatWindow.classList.add('open');
		btnToggle.style.display = 'none';

		if (!hasOpenedBefore) {
			hasOpenedBefore = true;
			loadHistory();
		}

		inputField.focus();
	}

	function closeChat() {
		isOpen = false;
		chatWindow.classList.remove('open');
		btnToggle.style.display = '';
	}

	btnToggle.addEventListener('click', function () {
		if (isOpen) {
			closeChat();
		} else {
			openChat();
		}
	});

	btnClose.addEventListener('click', function () {
		closeChat();
	});

	var btnReset = root.querySelector('.chat-widget-reset');
	btnReset.addEventListener('click', function () {
		resetChat();
	});

	// --- Message rendering ---

	function appendBotMessage(text) {
		var msgEl = document.createElement('div');
		msgEl.className = 'chat-widget-message chat-widget-message--bot';
		msgEl.textContent = text;
		messagesContainer.appendChild(msgEl);
		scrollToBottom();
	}

	function appendUserMessage(text) {
		var msgEl = document.createElement('div');
		msgEl.className = 'chat-widget-message chat-widget-message--user';
		msgEl.textContent = text;
		messagesContainer.appendChild(msgEl);
		scrollToBottom();
	}

	function appendBotMessageWithPrice(text, price) {
		var msgEl = document.createElement('div');
		msgEl.className = 'chat-widget-message chat-widget-message--bot';

		var textEl = document.createElement('div');
		textEl.textContent = text;
		msgEl.appendChild(textEl);

		if (price !== null && price !== undefined) {
			var priceEl = document.createElement('div');
			priceEl.className = 'chat-widget-price';
			priceEl.textContent = '$' + price;
			msgEl.appendChild(priceEl);
		}

		messagesContainer.appendChild(msgEl);
		scrollToBottom();
	}

	function showTypingIndicator() {
		var typingEl = document.createElement('div');
		typingEl.className = 'chat-widget-typing';
		typingEl.setAttribute('data-typing', 'true');
		typingEl.innerHTML =
			'<span class="chat-widget-typing-dot"></span>' +
			'<span class="chat-widget-typing-dot"></span>' +
			'<span class="chat-widget-typing-dot"></span>';
		messagesContainer.appendChild(typingEl);
		scrollToBottom();
	}

	function removeTypingIndicator() {
		var typingEl = messagesContainer.querySelector('[data-typing="true"]');
		if (typingEl) {
			typingEl.remove();
		}
	}

	function appendErrorMessage(text) {
		var msgEl = document.createElement('div');
		msgEl.className =
			'chat-widget-message chat-widget-message--bot chat-widget-message--error';
		msgEl.textContent = text;
		messagesContainer.appendChild(msgEl);
		scrollToBottom();
	}

	function scrollToBottom() {
		messagesContainer.scrollTop = messagesContainer.scrollHeight;
	}

	// --- Input state ---

	function setInputDisabled(disabled) {
		isWaiting = disabled;
		inputField.disabled = disabled;
		btnSend.disabled = disabled;
		if (disabled) {
			btnSend.style.opacity = '0.5';
			btnSend.style.pointerEvents = 'none';
		} else {
			btnSend.style.opacity = '';
			btnSend.style.pointerEvents = '';
		}
	}

	// --- Send message ---

	function sendMessage() {
		if (isWaiting) {
			return;
		}

		var text = inputField.value.trim();
		if (!text) {
			return;
		}

		if (text.length > MAX_MESSAGE_LENGTH) {
			text = text.substring(0, MAX_MESSAGE_LENGTH);
		}

		inputField.value = '';
		appendUserMessage(text);
		addToHistory({ role: 'user', text: text });
		setInputDisabled(true);
		showTypingIndicator();

		var sessionId = getSessionId();

		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				session_id: sessionId,
				message: text,
			}),
		})
			.then(function (response) {
				if (!response.ok) {
					throw new Error(
						'Server responded with status ' + response.status,
					);
				}
				return response.json();
			})
			.then(function (data) {
				removeTypingIndicator();
				setSessionId(data.session_id);

				if (data.price !== null && data.price !== undefined) {
					appendBotMessageWithPrice(data.reply, data.price);
					addToHistory({
						role: 'bot',
						text: data.reply,
						price: data.price,
					});
				} else {
					appendBotMessage(data.reply);
					addToHistory({ role: 'bot', text: data.reply });
				}

				setInputDisabled(false);
				inputField.focus();
			})
			.catch(function (err) {
				console.error('chat-widget: API error', err);
				removeTypingIndicator();
				appendErrorMessage(
					'Sorry, something went wrong. Please try again in a moment.',
				);
				setInputDisabled(false);
				inputField.focus();
			});
	}

	// --- Event listeners ---

	btnSend.addEventListener('click', function () {
		sendMessage();
	});

	inputField.addEventListener('keydown', function (e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	});

	// --- Hamburger menu toggle (for mobile nav) ---

	var hamburger = document.querySelector('.header__hamburger');
	var nav = document.querySelector('.header__nav');
	if (hamburger && nav) {
		hamburger.addEventListener('click', function () {
			var expanded = hamburger.getAttribute('aria-expanded') === 'true';
			hamburger.setAttribute('aria-expanded', !expanded);
			hamburger.classList.toggle('active');
			nav.classList.toggle('open');
		});
	}
})();
