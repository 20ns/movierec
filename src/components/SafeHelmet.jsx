import React, { Component } from 'react';
import { Helmet } from 'react-helmet-async';

export default class SafeHelmet extends Component {
  state = { mounted: false };

  componentDidMount() {
    this.setState({ mounted: true });
  }

  render() {
    return this.state.mounted ? (
      <Helmet {...this.props}>{this.props.children}</Helmet>
    ) : null;
  }
}