import React from 'react';

/**
 * 组件按钮测试
 *
 * @kind component
 *
 * @author mark stock <markstock7@hotmail.com>
 */
 class Button extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <button />
        );
    }
}

Button.propTypes = {
    bool: React.PropTypes.bool,
    func: React.PropTypes.func,
}

