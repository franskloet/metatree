import React from 'react';
import MetadataViewer from "./MetadataViewer";
import ErrorMessage from "../error/ErrorMessage";
import Typography from "@material-ui/core/Typography";

class Metadata extends React.Component {
    static defaultProps = {
        onDidLoad: () => {}
    }

    constructor(props) {
        super(props);
        this.subject = props.subject;
        this.metadataAPI = props.metadataAPI;

        this.state = {

            loading: false,
            error: false,
            errorMessage: null,
            properties: {}
        };
    }

    componentWillMount() {
        this.loadData();
    }


    componentDidUpdate(prevProps) {
        if(this.props.refresh && this.props.refresh !== prevProps.refresh) {
            this.loadData();
        }
    }

    loadData() {
        if (!this.subject) {
            console.warn("No subject given to retrieve metadata for");
            this.setState({error: true});
            return;
        }

        this.setState({loading: true, error: false});

        Promise.all([
            this.metadataAPI.getVocabulary(),
            this.metadataAPI.get({subject: this.subject})
        ]).then(([vocabulary, metadata]) => {
            if (this.willUnmount) return;

            const combinedProperties = vocabulary.combine(metadata)

            this.props.onDidLoad();
            this.setState({properties: combinedProperties, loading: false});
        }).catch(e => {
            if (this.willUnmount) return;

            console.error("Error while loading metadata", e);
            this.setState({error: true, loading: false});
        })
    }

    componentWillUnmount() {
        this.willUnmount = true
    }

    componentWillReceiveProps(props) {
        if (this.subject !== props.subject) {
            this.subject = props.subject;
            this.loadData();
        }
    }

    renderBody() {
        if (this.state.error) {
            return (<ErrorMessage message="An error occurred while loading metadata"/>)
        } else if (this.state.loading) {
            return (<div>Loading...</div>)
        } else if (this.state.properties.length === 0) {
            return (<div>No metadata found</div>)
        } else {
            return (<MetadataViewer subject={this.subject} metadataAPI={this.metadataAPI} properties={this.state.properties}/>)
        }
    }

    render() {
        return (
        <div>
            <Typography variant="subheading">Metadata:</Typography>
            {this.renderBody()}
        </div>
        )
    }
}

export default Metadata
