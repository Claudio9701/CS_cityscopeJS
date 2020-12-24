import React from "react";
import AppsIcon from "@material-ui/icons/Apps";
import Button from "@material-ui/core/Button";
import { gridCreator } from "./gridCreator";
import { listenToGridCreator } from "../../../../../redux/actions";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function GridMaker(props) {
    const dispatch = useDispatch();
    const reduxState = useSelector((state) => state);

    const handleGridCreation = async () => {
        // NOTE: This will only wait if props.gridProps.osmTypes is true
        let grid = await gridCreator(props.gridProps, reduxState.TYPES_LIST);
        await dispatch(listenToGridCreator(grid));
    };

    return (
        <Button
            onClick={() => {
                handleGridCreation();
            }}
            variant="outlined"
            color="default"
            startIcon={<AppsIcon />}
        >
            Create Grid
        </Button>
    );
}
