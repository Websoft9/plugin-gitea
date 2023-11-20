# Developer

## Technology Stack

**Frontend**  

- ui: [react-bootstrap](https://react-bootstrap.github.io/)
- js framework: [Create React App](https://create-react-app.dev/docs/documentation-intro)
- template: no use

**Backend API**  

- gitea: automatic login to Gitea
- cockpit: this is for running command at host machine

related classes:

- src/App.js


## Build and Test

You should install [Websoft9](https://github.com/Websoft9/websoft9) for testing, then build it:

```
git clone https://github.com/Websoft9/plugin-gitea
cd plugin-gitea

# test
yarn start
yarn test

# build
yarn build && cp -r ./build/* /usr/share/cockpit/gitea/
```
