var CommentBox = React.createClass({displayName: "CommentBox",
  componentDidMount: function () {
    window.addEventListener('scroll', this.onPageScroll);
  },

  componentWillUnmount: function () {
    window.removeEventListener('scroll', this.onPageScroll);
  },
  
  onPageScroll: function () {
    var bg = document.getElementById("bg");
    var bgPos = (document.body.scrollTop / 10) * -1;
    bg.style["-webkit-transform"] = "translate3d(0," + bgPos + "px, 0)";
    bg.style["transform"] = "translate3d(0px, " + bgPos + "px, 0)";
  },
  
  render: function() {
    return (
      React.createElement("div", {className: "content-box"}, 
       "ADAM! Hello, world. I am a CommentBox!!! Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox... Hello, world! I am a CommentBox...",  
        React.createElement("div", {id: "item"}, "scroll item.")
      )
    );
  }
  
});
React.render(
  React.createElement(CommentBox, null),
  document.getElementById('content')
);