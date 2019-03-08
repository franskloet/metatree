import React from 'react';
import {
    Table, TableHead, TableRow, TableCell,
    TableBody, Typography, Icon,
    withStyles, Paper, Grid, Checkbox
} from "@material-ui/core";
import filesize from 'filesize';

import {DateTime} from "../common";
import styles from './FileList.styles';

const fileList = ({classes, files, onPathClick, onPathDoubleClick, selectionEnabled, onAllSelection}) => {
    if (!files || files.length === 0 || files[0] === null) {
        return (
            <Grid container>
                <Grid item xs={12}>
                    <Typography variant="subtitle1" style={{textAlign: 'center'}}>Empty directory</Typography>
                </Grid>
            </Grid>
        );
    }

    let checkboxHeader = null;

    if (selectionEnabled) {
        const numOfSelected = files.filter(f => f.selected).length;
        const allItemsSelected = files.length === numOfSelected;
        checkboxHeader =
            <TableCell padding="none">
                <Checkbox
                    indeterminate={numOfSelected > 0 && numOfSelected < files.length}
                    checked={allItemsSelected}
                    onChange={(event) => onAllSelection(event.target.checked)}
                />
            </TableCell>;
    }

    return (
        <Paper className={classes.root}>
            <Table padding="dense">
                <TableHead>
                    <TableRow>
                        {checkboxHeader}
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Size</TableCell>
                        <TableCell align="right">Last Modified</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {files.map((file) => {
                        const item = selectionEnabled ? file.item : file;
                        return (
                            <TableRow
                                hover
                                key={item.filename}
                                selected={selectionEnabled && file.selected}
                                onClick={() => onPathClick(item)}
                                onDoubleClick={() => onPathDoubleClick(item)}
                            >
                                {
                                    selectionEnabled ? (
                                        <TableCell padding="none">
                                            <Checkbox checked={file.selected} />
                                        </TableCell>
                                    ) : null
                                }

                                <TableCell>
                                    <Grid
                                        container
                                        spacing={16}
                                        alignItems="center"
                                    >
                                        <Grid item>
                                            <Icon>
                                                {item.type === 'directory' ? 'folder_open' : 'note_open'}
                                            </Icon>
                                        </Grid>
                                        <Grid item>
                                            {item.basename}
                                        </Grid>
                                    </Grid>
                                </TableCell>
                                <TableCell padding="none" align="right">
                                    {item.type === 'file' ? filesize(item.size) : ''}
                                </TableCell>
                                <TableCell align="right">
                                    {item.lastmod ? <DateTime value={item.lastmod} /> : null}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Paper>
    );
};

export default withStyles(styles)(fileList);
