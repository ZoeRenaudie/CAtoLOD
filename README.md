Cette application a été développée en React par Zoë Renaudie (avec le soutien de Claude.ai) dans le cadre du projet [Forward linking](https://github.com/ouvroir/forward-linking). Elle permet de parser le profil de configuration exporté depuis Providence/CollectiveAccess afin d'en extraire les mappings de chaque table au format CSV ou XML.

Fonctionne avec le schéma d'export des configuration de CollectiveAccess dont la hierarchie comporte : 
- profile
    - locales
    - lists
    - elementSets
    - userinterfaces 
    - relationshipTypes
    - roles
    - groups
    - displays
    - searchForms.
 
Warning 11.11.25 : pas possible d'exporter toutes les tables en xml pour l'instant depuis collective access. 
exports elements ne sont plus bons. 

@todo : Ajouter les infos suivantes : 
- donner la procedure entière pour exporter données de CA
- L'export en csv doit être un .xslx pour être upload dans providence. si le titre dans settings est le meme, il remplacera l'ancien. 
- L'export se fera en csv. Pour pouvoir exporter en xml ou MARC  changer la case dans les settings dans le csv et ajouter informations necessaire (root et parents pour xml)
- partager à la communauté collective access pour double check que tout est bon.
- explorer DRY dans REACT pour les settings d'export dans le code https://javascript.plainenglish.io/dont-repeat-yourself-principle-in-react-8ce4ed251967
- dans a propos: profile au meme niveau que local

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Documentation : https://react.dev/blog/2023/03/16/introducing-react-dev

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
