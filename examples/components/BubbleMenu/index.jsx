import React     from 'react';

const PropTypes = React.PropTypes;

var propTypes = {
    /**
     * 我是一个array类型的值
     * @description 我是一段array类型的description
     */
    array: React.PropTypes.array.isRequired,

    /**
     * 我是一个bool类型的值
     */
    bool: React.PropTypes.bool,
    func: React.PropTypes.func,
    number: React.PropTypes.number,
    object: React.PropTypes.object,
    string: React.PropTypes.string,
    symbol: React.PropTypes.symbol,
    node: React.PropTypes.node,
    element: React.PropTypes.element,
    reactInstance: PropTypes.instanceOf(React),
    enum: React.PropTypes.oneOf(['News', 'Photos']),
    enumType: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
        PropTypes.instanceOf(Message)
    ]),
    arrayOf: PropTypes.arrayOf(React.PropTypes.number),
    objectOf: PropTypes.objectOf(React.PropTypes.number),
    shape: React.PropTypes.shape({
        color: PropTypes.string,
        fontSize: PropTypes.number
    }),
    any: React.PropTypes.any
};

/**
 * BubbleMenu的child，每一项菜单的的选项
 *
 * @kind component
 *
 * @author mark stock <markstock7@hotmail.com>
 *
 * @description BubbleMenu的child，每一项菜单的的选项
 *
 * @example
 *     <BubbleMenu>
 *     </BubbleMenu>
 *  ```html
    <FunnelChart funnel={FunnelChart.mockData.funnel} />
    <FunnelChart
        funnel={FunnelChart.mockData.funnel}
        portion
    />
    ```
 */
class BubbleMenuItem extends React.Component {
    constructor(props) {
        super(props);
    }
}

BubbleMenuItem.propTypes = propTypes;
BubbleMenuItem.defaultProps = {
    array: [],
    string: 'default string',
    number: 'default number'
};

export default BubbleMenuItem;