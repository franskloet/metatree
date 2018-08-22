import React from 'react';
import CollectionList from "../CollectionList/CollectionList";

class CollectionOverview extends React.Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.collectionStore = props.collectionStore;
        this.onCollectionsDidLoad = props.onCollectionsDidLoad;

        // Initialize state
        this.state = {
            loading: false,
            collections: [],
            selectedCollection: props.selectedCollection
        };
    }

    componentDidMount() {
        this.loadContents();
    }

    componentWillUnmount() {
        this.isUnmounting = true;
    }

    loadContents() {
        if(this.state.loading) {
            return;
        }

        this.setState({loading: true});

        return this.collectionStore
            .getCollections()
            .then(collections => {
                if (this.isUnmounting) {
                    return;
                }

                // Update the state and send out events
                this.setState({loading: false, collections: collections});
                if(this.onCollectionsDidLoad) {
                    this.onCollectionsDidLoad(collections);
                }

                return collections;
            })
            .catch(err => {
                if (this.isUnmounting) {
                    return;
                }
                console.error("An error occurred while loading collections", err);
                this.setState({error: true, loading: false});
            });
    }

    deleteCollection(collection) {
        if(window.confirm("Are you sure?")) {
            return this.collectionStore
                .deleteCollection(collection.id)
                .then(this.loadContents.bind(this))
                .catch(err => {
                    if (this.isUnmounting) {
                        return;
                    }
                    console.error("An error occurred while deleting collection", err);
                    this.setState({error: true, loading: false});
                })
        } else {
            return Promise.resolve();
        }
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.refreshCollections) {
            this.loadContents();
        }

        this.setState({
            selectedCollection: nextProps.selectedCollection
        });
    }

    render() {
        if(this.state.loading) {
            return (<div>Loading...</div>);
        }

        return (
            <CollectionList collections={this.state.collections}
                            selectedCollection={this.state.selectedCollection}
                            onCollectionClick={this.props.onCollectionClick}
                            onCollectionDoubleClick={this.props.onCollectionDoubleClick}
                            onCollectionDelete={this.deleteCollection.bind(this)}
            />);
    }
}

export default CollectionOverview;
