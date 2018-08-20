import React from 'react';
import combine from './MetadataUtils';


/**
 * This compp
 */
class MetadataViewer extends React.Component {

    constructor(props) {
        super(props);
        this.props = props;
        this.vocabulary = props.vocab;
        this.metadata = props.metadata;
        this.state = {
            properties: []
        };
    }

    componentWillMount() {
        combine(this.vocabulary, this.metadata)
            .then(props => this.setState({properties: props}));

    }

    renderProperty(p) {
        return (<li key={p.label}><b>{p.label}</b>: {p.values.join(', ')}</li>);
    }

    render() {
        return (
            <div>
                <ul>
                    {this.state.properties.map(this.renderProperty)}
                </ul>

            </div>
        )

    }
}

export default MetadataViewer
