import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';

class AlertDialog extends React.Component {

    handleDisagree = () => {
        this.props.onDisagree();
    };

    handleAgree = () => {
        this.props.onAgree();
    };

    handleClose = () => {
        this.props.onClose();
    };

    render() {
        const {title, content, open} = this.props;
        return (
            <Dialog
                open={open}
                onClose={this.handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {content}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleDisagree} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={this.handleAgree} color="primary" autoFocus>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

AlertDialog.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    content: PropTypes.string,
    onAgree: PropTypes.func,
    onDisagree: PropTypes.func,
    onClose: PropTypes.func,
};

AlertDialog.defaultProps = {
    open: false,
    title: '',
    content: '',
};

export default AlertDialog;
