import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import cockpit from 'cockpit';
import { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [iframeKey, setIframeKey] = useState(Math.random());
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  let protocol = window.location.protocol;
  let host = window.location.host;
  let userName = ""
  let userPwd = ""
  const baseURL = protocol + "//" + (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host) ? host.split(":")[0] : host);

  async function autoLogin() {
    try {
      var script = "docker exec -i websoft9-apphub apphub getconfig --section gitea";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
      content = JSON.parse(content);

      userName = content.user_name;
      userPwd = content.user_pwd;

      if (!userName || !userPwd) {
        setShowAlert(true);
        setAlertMessage("Gitea Username or Password is empty.");
        return;
      }

      const response = await axios.get(baseURL + '/w9git/user/login');
      const doc = new DOMParser().parseFromString(response.data, 'text/html');
      const csrf = doc.querySelector('input[name="_csrf"]').value;

      const payload = new URLSearchParams();
      payload.append('_csrf', csrf);
      payload.append('user_name', userName);
      payload.append('password', userPwd);

      const login_response = await axios.post(baseURL + "/w9git/user/login", payload.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          withCredentials: true
        });
      if (login_response.status != 200) {
        setShowAlert(true);
        setAlertMessage("Auth Gitea Error.");
        return;
      }

      setIframeKey(Math.random());
      var newHash = window.location.hash;
      if (newHash.includes(`/w9git/${userName}`)) {
        var index = newHash.indexOf("#");
        if (index > -1) {
          var url = newHash.slice(index + 1);
          setIframeSrc(baseURL + url);
        }
      }
      else {
        setIframeSrc(baseURL + '/w9git/explore/repos');
      }
    } catch (error) {
      setShowAlert(true);
      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');

      if (errorText.includes("permission denied")) {
        setAlertMessage("Permission denied.");
      }
      else {
        setAlertMessage(errorText || "Login Gitea Error.");
      }
    }
  }

  const handleHashChange = () => {
    var newHash = window.location.hash;
    if (newHash.includes(`/w9git/${userName}`)) {
      var index = newHash.indexOf("#");
      if (index > -1) {
        var content = newHash.slice(index + 1);
        setIframeKey(Math.random());
        setIframeSrc(baseURL + content);
      }
    }
  }

  useEffect(async () => {
    await autoLogin();

    window.addEventListener("hashchange", handleHashChange, true);
    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, []);

  return (
    <>
      {
        iframeKey && iframeSrc ? (
          <div className='myGitea' key='container'>
            <iframe key={iframeKey} title='Gitea' src={iframeSrc} />
          </div>
        ) : (
          <div className="d-flex align-items-center justify-content-center m-5" style={{ flexDirection: "column" }}>
            <Spinner animation="border" variant="secondary" className='mb-5' />
            {showAlert && <Alert variant="danger" className="my-2">
              {alertMessage}
            </Alert>}
          </div>
        )
      }
    </>
  );
}

export default App;
