import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import cockpit from 'cockpit';
import ini from 'ini';
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
  const baseURL = protocol + "//" + (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host) ? host.split(":")[0] : host);

  async function autoLogin() {
    try {
      const content = await cockpit.file('/var/lib/docker/volumes/websoft9_apphub_config/_data/config.ini').read();
      const config = ini.parse(content);
      const userName = config.gitea.user_name
      const userPwd = config.gitea.user_pwd

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
      setIframeSrc(baseURL + '/w9git/explore/repos');
    } catch (error) {
      setShowAlert(true);
      setAlertMessage("Auth Gitea Error.");
    }
  }

  useEffect(() => {
    autoLogin();
    return () => {
    }
  }, []);

  return (
    <>
      {
        iframeSrc ? (
          <div className='myGitea' key='container'>
            <iframe title='Gitea' src={iframeSrc} />
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
