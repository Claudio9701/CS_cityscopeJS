import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Switch from "@material-ui/core/Switch";
import Drawer from "@material-ui/core/Drawer";
import Fab from "@material-ui/core/Fab";
import MenuIcon from "@material-ui/icons/Menu";

export default function Menu() {
    const toggleID = [
        "PATHS",
        "ABM",
        "GRID",
        "ACCESS",
        "SUN",
        "3D_BUILDING",
        "EDIT"
    ];
    const useStyles = makeStyles(theme => ({
        root: {
            width: "100%",
            maxWidth: "15em",
            position: "absolute",
            backgroundColor: "rgba(255,255,255,0.8)",
            "& > *": {
                margin: theme.spacing(1)
            }
        },
        list: {
            width: "15em"
        },
        fullList: {
            width: "auto"
        },

        menuButton: {
            position: "absolute",
            top: theme.spacing(2),
            left: theme.spacing(2)
        }
    }));

    const classes = useStyles();
    const [toggleStateArray, setChecked] = React.useState([]);
    const [state, setState] = React.useState({
        left: false
    });
    const toggleDrawer = (side, open) => event => {
        if (
            event.type === "keydown" &&
            (event.key === "Tab" || event.key === "Shift")
        ) {
            return;
        }

        setState({ ...state, [side]: open });
    };
    const sideList = side => (
        <div
            className={classes.list}
            role="presentation"
            onClick={toggleDrawer(side, false)}
            onKeyDown={toggleDrawer(side, false)}
        ></div>
    );
    const handleToggle = value => () => {
        const currentIndex = toggleStateArray.indexOf(value);
        const newChecked = [...toggleStateArray];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }
        setChecked(newChecked);
        //console.log(newChecked);
    };
    let togglesArray = [];
    for (let i = 0; i < toggleID.length; i++) {
        const thisToggle = (
            <ListItem key={toggleID[i]}>
                <ListItemText primary={toggleID[i]} />
                <ListItemSecondaryAction>
                    <Switch
                        edge="end"
                        onChange={handleToggle(toggleID[i])}
                        checked={toggleStateArray.indexOf(toggleID[i]) !== -1}
                    />
                </ListItemSecondaryAction>
            </ListItem>
        );
        togglesArray.push(thisToggle);
    }
    return (
        <div>
            <div className={classes.root}>
                <Drawer
                    anchor="left"
                    open={state.left}
                    onClose={toggleDrawer("left", false)}
                >
                    {sideList("left")}
                    <List className={classes.root}>{togglesArray}</List>
                </Drawer>
                <Fab
                    aria-label="add"
                    className={classes.menuButton}
                    onClick={toggleDrawer("left", true)}
                >
                    <MenuIcon />
                </Fab>
            </div>
        </div>
    );
}