import React from 'react';

export default function Scoreboard({ visible, players }) {
    if (!visible) return null;

    return (
        <div className="scoreboard-overlay">
            <div className="scoreboard">
                <h2>SCOREBOARD</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Kills</th>
                            <th>Deaths</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, i) => (
                            <tr key={i}>
                                <td>{p.name}</td>
                                <td>{p.kills}</td>
                                <td>{p.deaths}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="scoreboard-hint">Hold TAB to view</p>
            </div>
        </div>
    );
}
