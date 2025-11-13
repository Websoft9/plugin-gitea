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

  let userName = ""
  let userPwd = ""
  let baseURL = ""

  async function autoLogin() {
    try {
      const script_git = "docker exec -i websoft9-apphub apphub getconfig --section gitea";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script_git], { superuser: "try" })).trim();
      content = JSON.parse(content);

      userName = content.user_name;
      userPwd = content.user_pwd;

      if (!userName || !userPwd) {
        setShowAlert(true);
        setAlertMessage("Gitea Username or Password Not Set.");
        return;
      }

      const script_nginx = "docker exec -i websoft9-apphub apphub getconfig --section nginx_proxy_manager";
      let content_nginx = (await cockpit.spawn(["/bin/bash", "-c", script_nginx], { superuser: "try" })).trim();
      content_nginx = JSON.parse(content_nginx);
      let listen_port = content_nginx.listen_port;

      if (!listen_port) {
        setShowAlert(true);
        setAlertMessage("Nginx Listen Port Not Set.");
        return;
      }

      baseURL = `${window.location.protocol}//${window.location.hostname}:${listen_port}`;

      // 首先尝试访问主页，检查是否已经登录
      try {
        const checkResponse = await axios.get(baseURL + '/w9git/explore/repos', {
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        });

        // 如果能成功访问，说明已经登录，直接设置 iframe
        setIframeKey(Math.random());
        var newHash = window.location.hash;
        if (newHash.includes(`/w9git/${userName}`)) {
          var index = newHash.indexOf("#");
          if (index > -1) {
            var url = newHash.slice(index + 1);
            setIframeSrc(baseURL + url);
          }
        } else {
          setIframeSrc(baseURL + '/w9git/explore/repos');
        }
        return;
      } catch (checkError) {
        // 如果未登录或出错，继续执行登录流程
        console.log('Not logged in, proceeding with login...');
      }

      // 获取登录页面和 CSRF token
      const response = await axios.get(baseURL + '/w9git/user/login', {
        withCredentials: true
      });
      const doc = new DOMParser().parseFromString(response.data, 'text/html');

      // 获取 CSRF token
      const csrfElement = doc.querySelector('input[name="_csrf"]');

      if (!csrfElement) {
        setShowAlert(true);
        setAlertMessage("Failed to get CSRF token from login page. Please check if Gitea is running properly.");
        return;
      }

      const csrf = csrfElement.value;

      if (!csrf) {
        setShowAlert(true);
        setAlertMessage("CSRF token is empty.");
        return;
      }

      // 执行登录
      const payload = new URLSearchParams();
      payload.append('_csrf', csrf);
      payload.append('user_name', userName);
      payload.append('password', userPwd);

      const login_response = await axios.post(baseURL + "/w9git/user/login", payload.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        });

      if (login_response.status < 200 || login_response.status >= 400) {
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
        setAlertMessage("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
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
