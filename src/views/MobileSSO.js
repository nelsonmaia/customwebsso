import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../config";
import auth0 from 'auth0-js';

const { seamlessLoginPageClientId, domain } = getConfig();
const ssoConnection = "m2wv-mobilesso-db"
const host = "https://spa.yusasaki0.app"
const webAuth = new auth0.WebAuth({
  domain,
  clientID: seamlessLoginPageClientId,
  redirectUri: `${host}/mobilesso?sso_completed=true`,
  responseType: 'id_token'
});

const searchParams = new URLSearchParams(document.location.search)
const ssoCompleted = Boolean(searchParams.get("sso_completed"))
const DEBUG = Boolean(searchParams.get("debug"))

window.callbackFromMobileApp = function (json) {
  alert("Message received from native app: " + JSON.stringify(json)); // Alert to check if the message is received
  console.log("Message received:", json);
  try {
    const user_id = json.userId;
    const accessToken = json.accessToken;
    alert("Attempting login with userId: " + user_id + " and accessToken: " + accessToken); // Debug alert before login
    webAuth.login({
      realm: ssoConnection,
      email: `${user_id}@user.id`,
      password: accessToken
    });
  } catch (e) {
    console.log(e);
    alert("Error during login: " + e.message); // Alert error during login
  }
}

const testSSO = (e, { accessToken, userId }) => {
  e.preventDefault();
  alert("Testing SSO with userId: " + userId + " and accessToken: " + accessToken); // Alert to test SSO manually
  window.callbackFromMobileApp({ accessToken, userId });
}

window.webToNativeHelper = {
  isWebViewContext: () => {
    const isWebView = !!window.webkit || !!window.flutterApp || !!window.ReactNativeWebView;
    alert("Is web view context: " + isWebView); // Alert if running in web view
    return isWebView;
  },
  postMessage: (message) => {
    alert("Sending message to native app: " + JSON.stringify(message)); // Alert before sending a message to the native app
    window.webkit?.messageHandlers?.nativeBridge?.postMessage(message) || 
    window.flutterApp?.postMessage(JSON.stringify(message)) || 
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  }
};

export const MobileSSOComponent = () => {

  const { loginWithRedirect } = useAuth0();
  const [state, setState] = useState({
    accessToken: "", userId: ""
  });

  if (!ssoCompleted && DEBUG) {
    return (
      <div>
        <hr />
        DEBUG<br />
        Access Token: <input value={state.accessToken} width={500} onChange={e => setState({ ...state, accessToken: e.target.value })} />
        User ID: <input value={state.userId} width={500} onChange={e => setState({ ...state, userId: e.target.value })} />
        <button onClick={e => testSSO(e, state)}>Test SSO</button>
      </div>
    );
  }

  if (ssoCompleted) {
    alert("SSO completed, redirecting..."); // Alert to notify that SSO is completed
    loginWithRedirect({
      authorizationParams: {
        connection: ssoConnection,
        redirect_uri: `${host}/profile`
      }
    });
    return (<div>セッション確立されました。メインウェブサイトへリダイレクトしています。。。</div>);
  }

  if (!window.webToNativeHelper.isWebViewContext()) { 
    alert("Not in a web view context."); // Alert if it's not a web view context
    return (<div>このページはモバイルアプリケーションからのみアクセスできます</div>); 
  }

  alert("Sending mobilesso action to native app."); // Alert before sending mobilesso message
  window.webToNativeHelper.postMessage({ "action": "mobilesso" });
  return (<div>Auth0とセッションを確立しようとしています。。。</div>);
};

export default MobileSSOComponent;
