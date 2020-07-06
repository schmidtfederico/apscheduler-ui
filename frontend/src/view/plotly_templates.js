
const figure_template = JSON.stringify({
    "layout": {
        "autosize": false,
        "font": {
            "color": "rgb(150, 159, 204)",
            "family": "IBM Plex Sans"
        },
        "xaxis": {
            "side": "top",
            "type": "date",
            "ticklen": 8,
            "showgrid": false,
            "tickmode": "linear",
            "gridcolor": "#474966",
            "linecolor": "#474966",
            "tickcolor": "#474966",
            "tickwidth": 1,
            "automargin": false,
            "zeroline": false,
            "tickformat": "",
            "fixedrange": true
        },
        "yaxis": {
            "type": "linear",
            "dtick": 86,
            "tick0": 66,
            "tickson": "labels",
            "showgrid": false,
            "showline": false,
            "zeroline": false,
            "tickmode": "linear",
            "showspikes": false,
            "showticklabels": false,
            "fixedrange": true
        },
        "margin": {
            "b": 0,
            "l": 0,
            "r": 0,
            "t": 0,
            "pad": 0
        },
        "template": {
            "layout": {
                "shapedefaults": {
                    "line": {
                        "width": 0
                    },
                    "opacity": 1
                },
                "annotationdefaults": {
                    "font": {
                        "size": 14,
                        "color": "rgb(231, 235, 255)",
                        "family": "IBM Plex Sans"
                    },
                    "arrowhead": 0,
                    "arrowcolor": "#f2f5fa",
                    "arrowwidth": 1,
                    "xanchor": "left",
                    "yanchor": "top",
                    "showarrow": false
                }
            }
        },
        "hoverlabel": {
            "font": {
                "color": "rgb(231, 235, 255)",
                "family": "IBM Plex Sans"
            },
            "bgcolor": "rgb(71, 73, 102)",
            "bordercolor": "rgb(71, 73, 102)"
        },
        "hovermode": "closest",
        "showlegend": false,
        "plot_bgcolor": "transparent",
        "paper_bgcolor": "transparent"
    },
    "frames": []
});

export default figure_template;