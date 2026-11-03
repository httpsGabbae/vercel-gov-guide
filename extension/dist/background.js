// extension/src/lib/crypto.ts
var e = "govguide_device_salt_v1";
async function t() {
	return new Promise((t) => {
		chrome.storage.local.get([e], (n) => {
			if (n[e]) {
				let r = n[e];
				t(new Uint8Array(r));
			} else {
				let n = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
				chrome.storage.local.set({ [e]: Array.from(n) }, () => t(n));
			}
		});
	});
}
async function n(e, t) {
	let n = new TextEncoder(), r = await crypto.subtle.importKey("raw", n.encode(e), { name: "PBKDF2" }, !1, ["deriveKey"]);
	return crypto.subtle.deriveKey({
		name: "PBKDF2",
		salt: t,
		iterations: 1e5,
		hash: "SHA-256"
	}, r, {
		name: "AES-GCM",
		length: 256
	}, !1, ["encrypt", "decrypt"]);
}
async function r(e, r) {
	let i = await t(), a = await n(r ? `govguide_pin_${r}` : "govguide_local_device_vault_2026", i), o = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12)), s = new TextEncoder().encode(JSON.stringify(e)), c = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: o
	}, a, s), l = {
		iv: Array.from(o),
		cipher: Array.from(new Uint8Array(c)),
		isPinProtected: !!r
	};
	return btoa(JSON.stringify(l));
}
async function i(e, r) {
	try {
		let i = await t(), a = JSON.parse(atob(e)), o = new Uint8Array(a.iv), s = new Uint8Array(a.cipher), c = await n(r ? `govguide_pin_${r}` : "govguide_local_device_vault_2026", i), l = await crypto.subtle.decrypt({
			name: "AES-GCM",
			iv: o
		}, c, s), u = new TextDecoder();
		return JSON.parse(u.decode(l));
	} catch {
		throw Error("Vault decryption failed. Invalid PIN or corrupted data.");
	}
}
// extension/src/lib/vault.ts
var a = "govguide_citizen_vault_encrypted", o = "govguide_extension_session", s = {
	firstName: "",
	middleName: "",
	lastName: "",
	suffix: "",
	gender: "MALE",
	dateOfBirth: "",
	placeOfBirth: "",
	civilStatus: "SINGLE",
	nationality: "FILIPINO",
	fatherFullName: "",
	fatherFirstName: "",
	fatherMiddleName: "",
	fatherLastName: "",
	fatherSuffix: "",
	motherMaidenFirstName: "",
	motherMaidenMiddleName: "",
	motherMaidenLastName: "",
	motherMaidenSuffix: "",
	mobileNumber: "",
	emailAddress: "",
	landline: "",
	region: "",
	province: "",
	cityMunicipality: "",
	barangay: "",
	streetHouseNumber: "",
	zipCode: "",
	philsysId: "",
	tin: "",
	sssNumber: "",
	philhealthNumber: "",
	pagibigMid: "",
	passportNumber: ""
}, c = {
	userRole: "guest",
	isAuthenticated: !1,
	citizenId: "active",
	apiBaseUrl: "http://localhost:3000",
	isOnlineSyncEnabled: !0
};
async function l() {
	return new Promise((e, t) => {
		chrome.storage.local.get([o], (n) => {
			chrome.runtime.lastError ? t(Error(chrome.runtime.lastError.message)) : n.govguide_extension_session ? e({
				...c,
				...n[o]
			}) : e(c);
		});
	});
}
async function u(e) {
	let t = {
		...await l(),
		...e
	};
	return new Promise((e, n) => {
		chrome.storage.local.set({ [o]: t }, () => {
			chrome.runtime.lastError ? n(Error(chrome.runtime.lastError.message)) : e(t);
		});
	});
}
async function d(e) {
	return new Promise((t, n) => {
		chrome.storage.local.get([a], async (r) => {
			if (chrome.runtime.lastError) n(Error(chrome.runtime.lastError.message));
			else {
				if (r.govguide_citizen_vault_encrypted) try {
					let n = r[a];
					t(await i(n, e));
					return;
				} catch {}
				t(s);
			}
		});
	});
}
async function f(e, t) {
	let n = await r(e, t);
	return new Promise((e, t) => {
		chrome.storage.local.set({ [a]: n }, () => {
			chrome.runtime.lastError ? t(Error(chrome.runtime.lastError.message)) : e();
		});
	});
}
function p(e, t) {
	if (!e || typeof e != "object") return t || s;
	let n = (e.first_name || "").trim(), r = (e.middle_name || "").trim(), i = (e.last_name || "").trim(), a = (e.suffix || "").trim();
	if (!n && !i && e.display_name && e.display_name.trim()) {
		let t = e.display_name.trim().split(/\s+/);
		t.length === 1 ? n = t[0] : t.length === 2 ? (n = t[0], i = t[1]) : t.length >= 3 && (n = t[0], r = t.slice(1, -1).join(" "), i = t[t.length - 1]);
	}
	let o = (e.father_first_name || "").trim(), c = (e.father_middle_name || "").trim(), l = (e.father_last_name || "").trim(), u = (e.father_suffix || "").trim(), d = (e.father_name || "").trim();
	if (!o && !l && d) {
		let e = d.split(/\s+/);
		e.length === 1 ? o = e[0] : e.length === 2 ? (o = e[0], l = e[1]) : e.length >= 3 && (o = e[0], c = e.slice(1, -1).join(" "), l = e[e.length - 1]);
	}
	let f = (e.mother_first_name || "").trim(), p = (e.mother_middle_name || "").trim(), m = (e.mother_last_name || e.maiden_name || "").trim(), h = (e.mother_suffix || "").trim(), g = (e.mother_maiden_name || "").trim();
	if (!f && !m && g) {
		let e = g.split(/\s+/);
		e.length === 1 ? f = e[0] : e.length === 2 ? (f = e[0], m = e[1]) : e.length >= 3 && (f = e[0], p = e.slice(1, -1).join(" "), m = e[e.length - 1]);
	}
	let _ = t?.firstName?.trim().toLowerCase() || "", v = t?.lastName?.trim().toLowerCase() || "", y = n.trim().toLowerCase(), b = i.trim().toLowerCase(), x = t?.emailAddress?.trim().toLowerCase() || "", S = (e.email || "").trim().toLowerCase(), C = (t?.philsysId || "").replace(/[-\s]/g, ""), w = (e.philsys_id || e.philsys_card_number || "").replace(/[-\s]/g, ""), T = t && (w && C && w === C || S && x && S === x || y && b && _ === y && v === b) && t ? t : s;
	return {
		firstName: n || T.firstName || "",
		middleName: r || T.middleName || "",
		lastName: i || T.lastName || "",
		suffix: a || T.suffix || "",
		gender: e.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : e.gender?.toUpperCase() === "OTHER" ? "OTHER" : "MALE",
		dateOfBirth: e.birth_date || e.date_of_birth || T.dateOfBirth || "",
		placeOfBirth: e.place_of_birth || (e.city ? `${e.city}, Philippines` : T.placeOfBirth || ""),
		civilStatus: e.civil_status?.toUpperCase() || T.civilStatus || "SINGLE",
		nationality: e.nationality || T.nationality || "FILIPINO",
		fatherFullName: d || [
			o,
			c,
			l,
			u
		].filter(Boolean).join(" ") || T.fatherFullName || "",
		fatherFirstName: o || T.fatherFirstName || "",
		fatherMiddleName: c || T.fatherMiddleName || "",
		fatherLastName: l || T.fatherLastName || "",
		fatherSuffix: u || T.fatherSuffix || "",
		motherMaidenFirstName: f || T.motherMaidenFirstName || "",
		motherMaidenMiddleName: p || T.motherMaidenMiddleName || "",
		motherMaidenLastName: m || T.motherMaidenLastName || "",
		motherMaidenSuffix: h || T.motherMaidenSuffix || "",
		mobileNumber: e.phone || e.mobile || e.mobile_number || e.contact_number || T.mobileNumber || "",
		emailAddress: e.email || T.emailAddress || "",
		landline: e.landline || T.landline || "",
		region: e.region || T.region || "",
		province: e.province || T.province || "",
		cityMunicipality: e.city || T.cityMunicipality || "",
		barangay: e.barangay || T.barangay || "",
		streetHouseNumber: e.street_address || e.residential_address || T.streetHouseNumber || "",
		zipCode: e.zip_code || T.zipCode || "",
		philsysId: e.philsys_id || e.philsys_card_number || T.philsysId || "",
		tin: e.tin || e.tin_number || T.tin || "",
		sssNumber: e.sss_number || T.sssNumber || "",
		philhealthNumber: e.philhealth_number || T.philhealthNumber || "",
		pagibigMid: e.pagibig_number || e.pagibigMid || T.pagibigMid || "",
		passportNumber: e.passport_number || e.passportNumber || T.passportNumber || "",
		relationshipToOwner: e.relationship || T.relationshipToOwner || "Self"
	};
}
// extension/src/lib/bridge.ts
function m(e) {
	try {
		let t = new URL(e);
		return t.protocol === "http:" && ["localhost", "127.0.0.1"].includes(t.hostname) || t.protocol === "https:" && (t.hostname === "govguide.ph" || t.hostname.endsWith(".govguide.ph"));
	} catch {
		return !1;
	}
}
async function h(e, t, n) {
	let r = (await chrome.tabs.query({})).filter((t) => t.id !== void 0 && t.url && m(t.url) && new URL(t.url).origin === new URL(e).origin && new URL(t.url).pathname.startsWith("/chat")).sort((t, n) => Number(n.active) - Number(t.active) || Number(new URL(n.url).origin === e) - Number(new URL(t.url).origin === e)), i = "Open GovGuide PH in Chrome and unlock My Details, then sync again.";
	for (let e of r) try {
		let r = await chrome.tabs.sendMessage(e.id, {
			type: "REQUEST_WEB_DETAILS",
			payload: {
				userId: t,
				applicant: n
			}
		});
		if (r?.success && r.applicant?.id && (!t || r.applicant.id === t)) return {
			...r,
			apiBaseUrl: new URL(e.url).origin
		};
		i = r?.error || i;
	} catch {
		i = "Refresh the GovGuide PH tab after reloading the extension, then unlock My Details.";
	}
	throw Error(i);
}
// extension/src/lib/citizen-chat.ts
var g = "govguide_citizen_chat_history";
(/* @__PURE__ */ new Date()).toISOString();
function _(e) {
	let t = e?.trim();
	return !t || t === "active" || t === "e1000000-0000-4000-8000-000000000003" ? null : `${g}_${t}`;
}
async function v(e) {
	return new Promise((t) => {
		try {
			let n = [g], r = _(e);
			r && n.push(r), chrome.storage.local.remove(n, () => t());
		} catch {
			t();
		}
	});
}
// extension/src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
	y();
});
function y() {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			id: "govguide_root",
			title: "GovGuide PH",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_mmn",
			parentId: "govguide_root",
			title: "Paste Mother's Maiden Name",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_philsys",
			parentId: "govguide_root",
			title: "Paste PhilSys National ID",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_philhealth",
			parentId: "govguide_root",
			title: "Paste PhilHealth PIN",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_tin",
			parentId: "govguide_root",
			title: "Paste BIR TIN",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_fullname",
			parentId: "govguide_root",
			title: "Paste Full Name",
			contexts: ["editable"]
		});
	});
}
chrome.contextMenus.onClicked.addListener(async (e, t) => {
	if (!t || !t.id) return;
	let n = await d(), r = "";
	switch (e.menuItemId) {
		case "govguide_paste_mmn":
			r = `${n.motherMaidenFirstName} ${n.motherMaidenLastName}`.trim();
			break;
		case "govguide_paste_philsys":
			r = n.philsysId || "";
			break;
		case "govguide_paste_philhealth":
			r = n.philhealthNumber || "";
			break;
		case "govguide_paste_tin":
			r = n.tin || "";
			break;
		case "govguide_paste_fullname": r = `${n.firstName} ${n.middleName} ${n.lastName}`.trim();
	}
	r && chrome.scripting.executeScript({
		target: { tabId: t.id },
		func: (e) => {
			let t = document.activeElement;
			t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && (t.value = e, t.dispatchEvent(new Event("input", { bubbles: !0 })), t.dispatchEvent(new Event("change", { bubbles: !0 })));
		},
		args: [r]
	});
});
function b(e) {
	try {
		chrome.runtime.sendMessage({
			type: "SESSION_UPDATED",
			session: x(e)
		}, () => {
			chrome.runtime.lastError;
		});
	} catch {}
}
function x(e) {
	let { accessToken: t, refreshToken: n, ...r } = e;
	return r;
}
async function S(e, t, n) {
	(await l()).userId !== e.userId && await f(s);
	let r = await u({
		isAuthenticated: !0,
		authSource: n,
		userRole: e.role,
		userId: e.userId,
		email: e.email,
		fullName: e.fullName,
		officerName: e.fullName,
		agencyCode: e.agencyCode,
		agencyName: e.agencyName,
		accessToken: t.accessToken,
		refreshToken: t.refreshToken,
		expiresAt: t.expiresAt,
		citizenId: e.userId
	});
	return b(r), r;
}
async function C() {
	let e = await l();
	await f(s), await v(e.userId || e.citizenId);
	let t = await u({
		isAuthenticated: !1,
		authSource: void 0,
		userRole: "guest",
		userId: void 0,
		citizenId: "active",
		email: void 0,
		fullName: void 0,
		officerName: void 0,
		agencyCode: void 0,
		agencyName: void 0,
		accessToken: void 0,
		refreshToken: void 0,
		expiresAt: void 0
	});
	b(t);
	try {
		chrome.runtime.sendMessage({
			type: "VAULT_UPDATED",
			vault: s,
			online: !1
		}, () => {
			chrome.runtime.lastError;
		});
	} catch {}
	return t;
}
async function w(e) {
	if (!e.refreshToken) return null;
	try {
		let t = await fetch(`${e.apiBaseUrl}/api/extension/auth`, {
			signal: AbortSignal.timeout(1e4),
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: e.refreshToken })
		}), n = await t.json();
		return !t.ok || !n.success ? null : await S(n.user, n.tokens, e.authSource || "extension");
	} catch {
		return null;
	}
}
async function T(e, t = {}) {
	let n = await l(), r = (e) => {
		let n = {
			"Content-Type": "application/json",
			"x-agency-role": "counter_officer",
			...t.headers || {}
		};
		return e && (n.Authorization = `Bearer ${e}`), n;
	}, i = (r) => fetch(`${n.apiBaseUrl}${e}`, {
		...t,
		headers: r,
		signal: t.signal || AbortSignal.timeout(1e4)
	}), a = await i(r(n.accessToken));
	if (a.status === 401 && n.refreshToken) {
		let e = await w(n);
		e && e.accessToken && (n = e, a = await i(r(e.accessToken)));
	}
	return a;
}
var E = null;
async function D(e) {
	let t = await l(), n = e.apiBaseUrl || t.apiBaseUrl;
	if (!m(n)) throw Error("Unsupported GovGuide origin.");
	if (e.signedOut && n !== t.apiBaseUrl) return { session: x(t) };
	if (e.signedOut) return t.isAuthenticated && t.authSource === "web" ? { session: x(await C()) } : { session: x(t) };
	if (!e.accessToken) return e.apiBaseUrl && e.apiBaseUrl !== t.apiBaseUrl ? { session: x(await u({ apiBaseUrl: e.apiBaseUrl })) } : { session: x(t) };
	if (t.isAuthenticated && t.accessToken === e.accessToken || E === e.accessToken) return { session: x(t) };
	E = e.accessToken;
	try {
		let r = await fetch(`${n}/api/extension/auth`, {
			headers: {
				Authorization: `Bearer ${e.accessToken}`,
				"x-extension-id": "govguide-extension"
			},
			signal: AbortSignal.timeout(1e4)
		}), i = await r.json();
		return !r.ok || !i.success ? {
			session: x(t),
			error: i.error || "Web session could not be verified"
		} : (e.apiBaseUrl && e.apiBaseUrl !== t.apiBaseUrl && await u({ apiBaseUrl: e.apiBaseUrl }), { session: x(await S(i.user, {
			accessToken: e.accessToken,
			refreshToken: e.refreshToken || ""
		}, "web")) });
	} finally {
		E = null;
	}
}
var O = Promise.resolve();
chrome.runtime.onMessage.addListener((e, t, n) => {
	if (t.tab && ![
		"GET_VAULT",
		"DETECTED_REFERENCE_NUMBER",
		"PUSH_VAULT_FROM_WEB",
		"SYNC_WEB_AUTH",
		"CLEAR_WEB_DETAILS"
	].includes(e.type)) return n({ error: "This action must be started in the extension." }), !1;
	if (t.tab && (e.type === "CLEAR_WEB_DETAILS" || e.type === "PUSH_VAULT_FROM_WEB" || e.type === "SYNC_WEB_AUTH" || e.type === "SET_SESSION")) {
		if (!t.url || !m(t.url) || t.frameId !== 0) return n({ error: "Untrusted sync source." }), !1;
		"payload" in e && (e.payload = {
			...e.payload,
			apiBaseUrl: new URL(t.url).origin
		});
	}
	let r = O.then(() => k(e));
	return O = r.catch(() => void 0), r.then(n).catch((e) => {
		n({ error: e.message || "Unknown background error" });
	}), !0;
});
async function k(e) {
	switch (e.type) {
		case "CLEAR_WEB_DETAILS": {
			let t = await l();
			return e.payload?.apiBaseUrl === t.apiBaseUrl && (await f(s), await u({ lastSyncedAt: void 0 }), chrome.runtime.sendMessage({
				type: "VAULT_UPDATED",
				vault: s,
				online: !1
			}, () => {
				chrome.runtime.lastError;
			})), { success: !0 };
		}
		case "GET_VAULT": return {
			vault: (await l()).isAuthenticated ? await d() : s,
			online: !1
		};
		case "SAVE_VAULT":
			if (!(await l()).isAuthenticated) throw Error("Sign in before saving details.");
			await f(e.payload.vault, e.payload.pin);
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: e.payload.vault,
					online: !1
				}, () => {
					chrome.runtime.lastError;
				});
			} catch {}
			return { success: !0 };
		case "PUSH_VAULT_FROM_WEB": {
			let { applicant: t, citizenId: n, apiBaseUrl: r } = e.payload, i = await l(), a = n || t?.id;
			if (!i.isAuthenticated || !a || a !== i.userId || t?.id !== a) throw Error("Sign in with the same GovGuide account before syncing details.");
			if (r && new URL(r).origin !== new URL(i.apiBaseUrl).origin) throw Error("This GovGuide tab does not match the connected account origin.");
			let o = p(t);
			await f(o);
			let s = await u({
				citizenId: a,
				lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			return b(s), chrome.runtime.sendMessage({
				type: "VAULT_UPDATED",
				vault: o
			}, () => {
				chrome.runtime.lastError;
			}), {
				success: !0,
				vault: o,
				session: x(s)
			};
		}
		case "GET_SESSION": return { session: x(await l()) };
		case "SET_SESSION": {
			let t = {};
			if (typeof e.payload.isOnlineSyncEnabled == "boolean" && (t.isOnlineSyncEnabled = e.payload.isOnlineSyncEnabled), e.payload.apiBaseUrl) {
				if (!m(e.payload.apiBaseUrl)) throw Error("Unsupported GovGuide origin.");
				t.apiBaseUrl = new URL(e.payload.apiBaseUrl).origin;
			}
			return { session: x(await u(t)) };
		}
		case "LOGIN": {
			let t = await l(), n = [t.apiBaseUrl], r = null, i = t.apiBaseUrl;
			for (let t of n) try {
				if (r = await fetch(`${t}/api/extension/auth`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-extension-id": "govguide-extension"
					},
					body: JSON.stringify({
						email: e.payload.email,
						password: e.payload.password
					}),
					signal: AbortSignal.timeout(1e4)
				}), r.ok) {
					i = t;
					break;
				}
			} catch {}
			if (!r) return {
				success: !1,
				error: "Unable to connect to GovGuide PH. Ensure the web app is running."
			};
			let a = await r.json().catch(() => ({}));
			return !r.ok || !a.success ? {
				success: !1,
				error: a.error || "Invalid email or password."
			} : (t.userId && t.userId !== a.user.userId && await f(s), i !== t.apiBaseUrl && await u({ apiBaseUrl: i }), {
				success: !0,
				session: x(await S(a.user, a.tokens, "extension"))
			});
		}
		case "LOGOUT": return {
			success: !0,
			session: x(await C())
		};
		case "SYNC_WEB_AUTH": return await D(e.payload);
		case "SAVE_WEB_DETAILS":
		case "SYNC_FROM_GOVGUIDE": try {
			let t = await l();
			if (!t.isAuthenticated || !t.userId) throw Error("Sign in before syncing My Details.");
			let n = await h(t.apiBaseUrl, t.userId, e.type === "SAVE_WEB_DETAILS" ? e.payload.applicant : void 0);
			if (n.apiBaseUrl !== new URL(t.apiBaseUrl).origin) throw Error("Open My Details on the connected GovGuide origin.");
			return await k({
				type: "PUSH_VAULT_FROM_WEB",
				payload: {
					applicant: n.applicant,
					citizenId: n.applicant.id,
					apiBaseUrl: n.apiBaseUrl
				}
			});
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Unable to sync My Details."
			};
		}
		case "FETCH_AGENCY_REQUESTS": try {
			let t = e.payload?.q?.trim() || "", n = await T(`/api/agency/requests${t ? `?q=${encodeURIComponent(t)}` : ""}`), r = await n.json();
			if (!n.ok || !r.success) throw Error(r.error || "Failed to load agency requests");
			return {
				success: !0,
				data: r.data
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Failed to load agency requests",
				data: []
			};
		}
		case "UPDATE_REQUEST_STATUS": try {
			let t = await T("/api/agency/requests", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(e.payload)
			}), n = await t.json();
			if (!t.ok || !n.success) throw Error(n.error || "Failed to update agency request status");
			try {
				chrome.notifications.create({
					type: "basic",
					iconUrl: "icons/icon-128.png",
					title: "GovGuide Agency Bridge",
					message: `${e.payload.requestId} updated: ${n.data?.statusLabel || "Saved"}`
				});
			} catch {}
			return {
				success: !0,
				data: n.data
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Failed to update agency request status"
			};
		}
		case "SHOW_NOTIFICATION": return chrome.notifications.create({
			type: "basic",
			iconUrl: "icons/icon-128.png",
			title: e.payload.title,
			message: e.payload.message
		}), { success: !0 };
		default: return { unhandled: !0 };
	}
}
