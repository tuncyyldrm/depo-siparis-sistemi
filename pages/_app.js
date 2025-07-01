// pages/_app.js
import '../styles/globals.css';
import cleanTerms from '../data/cleanTerms';


export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
