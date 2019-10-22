import React from 'react';
import './App.css';
import { Route, Switch } from 'react-router-dom'

// pages
import Main from './pages/Main'
import Sx from './pages/Sx'
import Hello from './pages/Hello'

function App() {
  return (
    <Switch>
      <Route exact path="/" component={Hello} />
      <Route path="/main" component={Main} />
      <Route path="/sx" component={Sx} />
    </Switch>
  );
}

export default App;
