@kind component
@name Button
@category Components
@chinese 富文本框
@type 文本编辑与显示

---

<link href="//cdn.bootcss.com/font-awesome/4.6.3/css/font-awesome.min.css" rel="stylesheet">
采用 draft-js 构建 GrowingIo 富文本框

## 如何使用
```html
raw 为RawDraftContentState 类型数据， 详情查看(http://facebook.github.io/draft-js/docs/api-reference-data-conversion.html#content)
<RichEditor placeholder='这是placeholder' onSave={(raw) => {}}/>
<ViewBox data={raw} />
```

`````jsx
import Button from 'antd/lib/button';
import ReactDOM from 'react-dom';

ReactDom.render(
    <Button>
    </Button>
, mountNode);
`````
