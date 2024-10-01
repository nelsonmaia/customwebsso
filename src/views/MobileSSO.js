import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../config";
import auth0 from 'auth0-js';

// Initialize configuration
const { seamlessLoginPageClientId, domain } = getConfig();
const ssoConnection = "m2wv-mobilesso-db";
const host = "https://spa.yusasaki0.app";
const webAuth = new auth0.WebAuth({
  domain,
  clientID: seamlessLoginPageClientId,
  redirectUri: `${host}/mobilesso?sso_completed=true`,
  responseType: 'id_token'
});

// Get search parameters
const searchParams = new URLSearchParams(document.location.search);
const ssoCompleted = Boolean(searchParams.get("sso_completed"));
const DEBUG = Boolean(searchParams.get("debug"));

// Function to update debug information in the custom HTML element
const updateDebugInfo = (message) => {
  const debugElement = document.getElementById('debugInfo');
  if (debugElement) {
    debugElement.textContent = message;
  }
};

// Create the debug div element on page load
useEffect(() => {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debugInfo';
  debugDiv.style.position = 'fixed';
  debugDiv.style.top = '0';
  debugDiv.style.width = '100%';
  debugDiv.style.backgroundColor = 'yellow';
  debugDiv.style.zIndex = '9999';
  debugDiv.style.padding = '10px';
  document.body.appendChild(debugDiv);
}, []);

window.callbackFromMobileApp = function (json) {
  updateDebugInfo("Message received from native app: " + JSON.stringify(json)); // Update debug element with message received
  console.log("Message received:", json);
  try {
    const user_id = json.userId;
    const accessToken = json.accessToken;
    updateDebugInfo("Attempting login with userId: " + user_id + " and accessToken: " + accessToken); // Update debug before login
    webAuth.login({
      realm: ssoConnection,
      email: `${user_id}@user.id`,
      password: accessToken
    });
  } catch (e) {
    console.log(e);
    updateDebugInfo("Error during login: " + e.message); // Update debug on error
  }
};

const testSSO = (e, { accessToken, userId }) => {
  e.preventDefault();
  updateDebugInfo("Testing SSO with userId: " + userId + " and accessToken: " + accessToken); // Update debug for manual test
  window.callbackFromMobileApp({ accessToken, userId });
};

window.webToNativeHelper = {
  isWebViewContext: () => {
    const isWebView = !!window.webkit || !!window.flutterApp || !!window.ReactNativeWebView;
    updateDebugInfo("Is web view context: " + isWebView); // Update debug if running in web view
    return isWebView;
  },
  postMessage: (message) => {
    updateDebugInfo("Sending message to native app: " + JSON.stringify(message)); // Update debug before sending message
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
    updateDebugInfo("SSO completed, redirecting..."); // Update debug when SSO completed
    loginWithRedirect({
      authorizationParams: {
        connection: ssoConnection,
        redirect_uri: `${host}/profile`
      }
    });
    return (<div>セッション確立されました。メインウェブサイトへリダイレクトしています。。。</div>);
  }

  if (!window.webToNativeHelper.isWebViewContext()) { 
    updateDebugInfo("Not in a web view context."); // Update debug if not in web view context
    return (<div>このページはモバイルアプリケーションからのみアクセスできます</div>); 
  }

  updateDebugInfo("Sending mobilesso action to native app."); // Update debug when sending mobilesso action
  window.webToNativeHelper.postMessage({ "action": "mobilesso" });
  return (<div>Auth0とセッションを確立しようとしています。。。</div>);
};

export default MobileSSOComponent;
